import { NextResponse } from "next/server";
import { menuItems } from "@/data/menu";
import { DELIVERY_FEE } from "@/lib/booking";
import { MAINTENANCE_MODE } from "@/lib/maintenance";
import { clientIp } from "@/lib/utils";
import { checkRateLimit } from "@/lib/rate-limit-store";
import { requireAuth, AuthError, authErrorResponse } from "@/lib/auth";
import { verifyRecaptcha } from "@/lib/recaptcha";
import { getSql, withTransaction } from "@/lib/db";

type ClientItem = {
  id?: unknown;
  quantity?: unknown;
  name?: unknown;
  flavor?: unknown;
  image?: unknown;
};

type Payload = {
  items?: unknown[];
  date?: string;
  slot?: string;
  deliveryMode?: "retrait" | "livraison";
  useCredits?: boolean;
  referralCode?: string;
  promoCode?: string;
  recaptchaToken?: string;
  customer?: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    email?: string;
    address?: string;
    notes?: string;
  };
};

const MAX_BODY_BYTES = 32 * 1024;
const MAX_ITEMS = 50;
const MAX_QUANTITY = 50;
const FIELD_LIMITS = {
  firstName: 80,
  lastName: 80,
  phone: 32,
  email: 120,
  address: 200,
  notes: 600,
};
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const ALLOWED_SLOTS = new Set([
  "12h00 - 12h30",
  "12h30 - 13h00",
  "13h00 - 13h30",
  "13h30 - 14h00",
  "19h00 - 19h30",
  "19h30 - 20h00",
  "20h00 - 20h30",
  "20h30 - 21h00",
]);

const PRICE_CACHE_TTL_MS = 60_000;
const STATIC_PRICE_BY_ID: Record<string, number> = Object.fromEntries(
  menuItems.map((i) => [i.id, i.price]),
);

let priceCache: { byId: Record<string, number>; expires: number } | null = null;
let priceCachePromise: Promise<Record<string, number>> | null = null;

async function getPriceById(): Promise<Record<string, number>> {
  const now = Date.now();
  if (priceCache && now < priceCache.expires) return priceCache.byId;
  if (priceCachePromise) return priceCachePromise;

  priceCachePromise = (async () => {
    const byId: Record<string, number> = { ...STATIC_PRICE_BY_ID };
    try {
      const sql = getSql();
      const rows = await sql<{ id: string; price: string | number }[]>`
        SELECT id, price FROM menu_items WHERE available = true
      `;
      for (const row of rows) {
        const price = typeof row.price === "number" ? row.price : Number(row.price);
        if (Number.isFinite(price) && price > 0) {
          byId[row.id] = price;
        }
      }
      priceCache = { byId, expires: Date.now() + PRICE_CACHE_TTL_MS };
    } catch (e) {
      console.warn("MENU_PG_READ_FAILED", (e as { code?: string }).code ?? "unknown");
    } finally {
      priceCachePromise = null;
    }
    return byId;
  })();

  return priceCachePromise;
}

function bad(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}

function clean(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "").trim().slice(0, max);
}

function generateReference(): string {
  const date = new Date();
  const ymd = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(
    date.getDate(),
  ).padStart(2, "0")}`;
  const rand = crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase();
  return `AM-${ymd}-${rand}`;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export async function POST(request: Request) {
  if (MAINTENANCE_MODE) {
    return bad("Service temporairement indisponible (maintenance).", 503);
  }

  // Coarse pre-auth IP guard: protects the network-bound verify calls
  // from unauthenticated floods. Uses the hardened clientIp (single shared
  // "untrusted-proxy" bucket off-Vercel), so it can no longer be bypassed by
  // forging IP headers.
  if (!(await checkRateLimit(`reservation:ip:${clientIp(request)}`, 10, 60_000))) {
    return bad("Trop de requêtes. Réessayez dans une minute.", 429);
  }

  // Read body once; recaptcha token now lives in the JSON body.
  const lenHeader = request.headers.get("content-length");
  if (lenHeader && Number(lenHeader) > MAX_BODY_BYTES) {
    return bad("Requête trop volumineuse.", 413);
  }

  let raw: string;
  try {
    raw = await request.text();
  } catch {
    return bad("Lecture impossible.");
  }
  if (raw.length > MAX_BODY_BYTES) {
    return bad("Requête trop volumineuse.", 413);
  }

  let payload: Payload;
  try {
    payload = JSON.parse(raw) as Payload;
  } catch {
    return bad("Format JSON invalide.");
  }

  // reCAPTCHA: enforced in production; in dev verifyRecaptcha returns true
  // when no secret is configured so local development still proceeds.
  if (process.env.NODE_ENV === "production") {
    const recaptchaToken =
      typeof payload.recaptchaToken === "string" ? payload.recaptchaToken : null;
    if (!recaptchaToken) {
      return bad("Non autorisé. reCAPTCHA manquant.", 401);
    }
    const ok = await verifyRecaptcha(recaptchaToken, { remoteIp: clientIp(request) });
    if (!ok) {
      return bad("Non autorisé. reCAPTCHA invalide ou expiré.", 401);
    }
  } else if (typeof payload.recaptchaToken === "string" && payload.recaptchaToken) {
    try {
      await verifyRecaptcha(payload.recaptchaToken, { remoteIp: clientIp(request) });
    } catch (e) {
      console.warn("RECAPTCHA_VERIFY_FAILED", (e as { code?: string }).code ?? "unknown");
    }
  }

  // Authentication via self-hosted JWT
  let claims;
  try {
    claims = await requireAuth(request);
  } catch (e) {
    if (e instanceof AuthError) {
      return authErrorResponse(e);
    }
    return bad("Non autorisé. Token invalide ou expiré.", 401);
  }
  const userId = claims.sub;

  // Per-uid rate limit keyed on the verified subject.
  if (!(await checkRateLimit(`reservation:uid:${userId}`, 10, 60_000))) {
    return bad("Trop de requêtes. Réessayez dans une minute.", 429);
  }

  const items = Array.isArray(payload.items) ? (payload.items as ClientItem[]) : [];
  if (items.length === 0) return bad("Le panier est vide.");
  if (items.length > MAX_ITEMS) return bad("Trop d'articles dans le panier.");

  const date = clean(payload.date, 10);
  const slot = clean(payload.slot, 32);
  if (!ISO_DATE_RE.test(date)) return bad("Date invalide.");

  // Check exception closures/holidays (blocked dates)
  try {
    const sql = getSql();
    const closureRows = await sql<{ value: { blockedDates?: string[] } }[]>`
      SELECT value FROM settings WHERE key = 'closures' LIMIT 1
    `;
    if (closureRows.length > 0) {
      const blockedDates = closureRows[0].value?.blockedDates || [];
      if (Array.isArray(blockedDates) && blockedDates.includes(date)) {
        return bad("Désolé, le restaurant est fermé exceptionnellement à cette date.");
      }
    }
  } catch (e) {
    console.warn("CLOSURE_CHECK_FAILED", e);
  }
  if (!slot) return bad("Créneau invalide.");
  if (!ALLOWED_SLOTS.has(slot)) return bad("Créneau non autorisé.");

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const requested = new Date(date + "T00:00:00");
  if (requested.getTime() < today.getTime() + 24 * 3600 * 1000) {
    return bad("Réservation minimum 24h à l'avance.");
  }

  const deliveryMode: "retrait" | "livraison" =
    payload.deliveryMode === "livraison" ? "livraison" : "retrait";

  const PRICE_BY_ID = await getPriceById();
  let serverSubtotal = 0;
  const sanitizedItems: any[] = [];

  for (const item of items) {
    const id = clean(item.id, 60);
    const qty = item.quantity;
    if (!id || !(id in PRICE_BY_ID)) {
      return bad(`Article inconnu: ${id || "(vide)"}`);
    }
    if (typeof qty !== "number" || !Number.isInteger(qty) || qty < 1 || qty > MAX_QUANTITY) {
      return bad("Quantité invalide.");
    }
    const price = PRICE_BY_ID[id];
    serverSubtotal += price * qty;

    sanitizedItems.push({
      id: id,
      name: clean(item.name, 100) || "Plat",
      price: price,
      quantity: qty,
      flavor: item.flavor ? clean(item.flavor, 50) : null,
      image: item.image ? clean(item.image, 200) : "",
    });
  }

  const serverDeliveryFee = deliveryMode === "livraison" ? DELIVERY_FEE : 0;
  const serverTotalBeforeDiscount = round2(serverSubtotal + serverDeliveryFee);

  const c = payload.customer || {};
  const customer = {
    firstName: clean(c.firstName, FIELD_LIMITS.firstName),
    lastName: clean(c.lastName, FIELD_LIMITS.lastName),
    phone: clean(c.phone, FIELD_LIMITS.phone),
    email: clean(c.email, FIELD_LIMITS.email),
    address: clean(c.address, FIELD_LIMITS.address),
    notes: clean(c.notes, FIELD_LIMITS.notes),
    deliveryMode,
    date,
    slot,
  };

  if (!customer.firstName || !customer.lastName) {
    return bad("Nom et prénom sont requis.");
  }
  if (customer.phone.replace(/\D/g, "").length < 8) {
    return bad("Numéro de téléphone invalide.");
  }
  if (deliveryMode === "livraison" && customer.address.length < 6) {
    return bad("Adresse de livraison requise.");
  }
  if (customer.email && !customer.email.includes("@")) {
    return bad("Email invalide.");
  }

  const reference = generateReference();

  try {
    let finalTotal = serverTotalBeforeDiscount;
    let finalDeposit = 0;
    let orderId = "";

    await withTransaction(async (tx) => {
      const userRows = await tx<
        {
          id: string;
          name: string | null;
          email: string | null;
          referral_credits: string | number | null;
          orders_count: number | null;
          has_used_welcome_offer: boolean | null;
          referred_by: string | null;
        }[]
      >`
        SELECT id, name, email, referral_credits, orders_count,
               has_used_welcome_offer, referred_by
        FROM users
        WHERE id = ${userId}
        FOR UPDATE
      `;
      if (userRows.length === 0) {
        throw new Error("Utilisateur introuvable.");
      }
      const userData = userRows[0];

      const rawCredits =
        typeof userData.referral_credits === "number"
          ? userData.referral_credits
          : Number(userData.referral_credits ?? 0);
      const currentCredits = Number.isFinite(rawCredits) ? Math.max(0, rawCredits) : 0;
      const ordersCount =
        typeof userData.orders_count === "number" ? userData.orders_count : 0;
      const hasUsedWelcomeOffer = userData.has_used_welcome_offer === true;

      // Logic des réductions
      const welcomeDiscount = (!hasUsedWelcomeOffer && ordersCount === 0) ? 5 : 0;
      let creditsToUse = 0;
      let promoDiscount = 0;
      let promoCodeUsed = "";

      let remainingTotal = serverTotalBeforeDiscount;

      const actualWelcomeDiscount = Math.min(welcomeDiscount, remainingTotal);
      remainingTotal -= actualWelcomeDiscount;

      if (typeof payload.promoCode === "string" && remainingTotal > 0) {
        const promoRows = await tx<
          { value: { codes?: Record<string, { code?: string; isActive?: boolean; discountType?: string; discountValue?: unknown }> } }[]
        >`
          SELECT value FROM settings WHERE key = 'promotions' LIMIT 1
        `;
        if (promoRows.length > 0) {
          const codes = promoRows[0].value?.codes || {};
          const codeData = codes[payload.promoCode.toUpperCase().trim()];
          if (codeData && codeData.isActive === true) {
            promoCodeUsed = codeData.code ?? "";
            // L-3: discountValue is admin-controlled and unvalidated. Coerce to
            // a finite number (else 0) and clamp before applying so a negative
            // value can't inflate the total and a >100% can't over-discount.
            const rawValue = Number(codeData.discountValue);
            const discountValue = Number.isFinite(rawValue) ? rawValue : 0;
            let calculatedPromo = 0;
            if (codeData.discountType === "percentage") {
              const pct = Math.min(100, Math.max(0, discountValue));
              calculatedPromo = round2(remainingTotal * (pct / 100));
            } else if (codeData.discountType === "fixed") {
              calculatedPromo = Math.max(0, discountValue);
            }
            promoDiscount = Math.min(Math.max(0, calculatedPromo), remainingTotal);
            remainingTotal -= promoDiscount;
          }
        }
      }

      if (payload.useCredits && remainingTotal > 0) {
        creditsToUse = Math.min(currentCredits, remainingTotal);
        remainingTotal -= creditsToUse;
      }

      finalTotal = round2(Math.max(0, remainingTotal));
      finalDeposit = round2(finalTotal * 0.5);

      // MED-1: explicit reject. A total of 0 would violate downstream
      // invariants (deposit-required flow); surface a clear French message
      // so the user knows to use fewer credits.
      if (finalTotal <= 0) {
        if (serverTotalBeforeDiscount > 0) {
          throw new Error(
            "Vos réductions couvrent intégralement la commande. Utilisez moins de crédits pour finaliser la réservation.",
          );
        }
        throw new Error("Erreur de calcul du total.");
      }

      const cleanedReferralCode =
        payload.referralCode && payload.referralCode.length >= 5
          ? clean(payload.referralCode, 20)
          : null;

      const discounts = {
        referralCredits: creditsToUse,
        welcomeOffer: welcomeDiscount > 0,
        referralCodeUsed: cleanedReferralCode,
        promoCodeUsed: promoCodeUsed || null,
        promoDiscount: promoDiscount > 0 ? promoDiscount : null,
      };

      // Vague2-E/H: resolve referral code to UID inside the order transaction.
      // First-order-only (referred_by IS NULL). Self-referral rejected silently.
      // Storing referrer_id here is the ONLY trusted population path; clients
      // cannot set it.
      let referrerId: string | null = null;
      if (cleanedReferralCode && userData.referred_by === null) {
        const referrerRows = await tx<{ id: string }[]>`
          SELECT id FROM users WHERE referral_code = ${cleanedReferralCode} LIMIT 1
        `;
        if (referrerRows.length > 0) {
          const matchId = referrerRows[0].id;
          if (matchId !== userId) {
            referrerId = matchId;
          }
        }
      }

      const userName = userData.name || `${customer.firstName} ${customer.lastName}`;
      const userEmail = (userData.email || customer.email || "").trim().toLowerCase();

      // Insert order. status defaults to 'Attente Acompte' at the column level
      // but we set it explicitly to mirror the previous Firestore write.
      const orderRows = await tx<{ id: string }[]>`
        INSERT INTO orders (
          reference,
          user_id,
          user_name,
          user_email,
          items,
          subtotal,
          delivery_fee,
          total,
          deposit_amount,
          discounts,
          status,
          customer,
          referrer_id
        ) VALUES (
          ${reference},
          ${userId},
          ${userName},
          ${userEmail},
          ${tx.json(sanitizedItems)},
          ${round2(serverSubtotal)},
          ${serverDeliveryFee},
          ${finalTotal},
          ${finalDeposit},
          ${tx.json(discounts)},
          ${"Attente Acompte"},
          ${tx.json(customer)},
          ${referrerId}
        )
        RETURNING id
      `;
      orderId = orderRows[0].id;

      // Update user: increment orders_count, optionally flip welcome offer,
      // decrement referral credits, and set referred_by only if not already set.
      await tx`
        UPDATE users
        SET
          orders_count = orders_count + 1,
          has_used_welcome_offer = (${welcomeDiscount > 0} OR has_used_welcome_offer),
          referral_credits = referral_credits - ${creditsToUse},
          referred_by = COALESCE(referred_by, ${referrerId}),
          updated_at = now()
        WHERE id = ${userId}
      `;
    });

    console.log("[Afro Miaam] Réservation confirmée et stockée", { orderId, reference, finalTotal });

    return NextResponse.json({
      ok: true,
      reference,
      orderId,
      serverSubtotal: round2(serverSubtotal),
      deliveryFee: serverDeliveryFee,
      total: finalTotal,
      depositAmount: finalDeposit,
    });
  } catch (error: any) {
    // Vague3-I: only surface our own intentional, user-facing business-rule
    // messages; anything else (DB / driver errors with internal detail like
    // column names, schema info) is replaced with a generic message and the
    // real error is kept server-side in logs.
    const SAFE_MESSAGES = new Set([
      "Utilisateur introuvable.",
      "Vos réductions couvrent intégralement la commande. Utilisez moins de crédits pour finaliser la réservation.",
      "Erreur de calcul du total.",
    ]);
    const msg = typeof error?.message === "string" ? error.message : "";
    const isDbError =
      error && typeof error === "object" && ("code" in error || "severity_local" in error);
    const safe = !isDbError && SAFE_MESSAGES.has(msg);
    console.error("TRANSACTION_FAILED", error);
    if (safe) return bad(msg, 400);
    return bad("Erreur lors de la validation et l'insertion de la commande.", 500);
  }
}
