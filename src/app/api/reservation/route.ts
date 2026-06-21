import { NextResponse } from "next/server";
import { getMenuById } from "@/lib/menu-cache";
import { DELIVERY_FEE } from "@/lib/booking";
import { MAINTENANCE_MODE } from "@/lib/maintenance";
import { clientIp } from "@/lib/utils";
import { checkRateLimit } from "@/lib/rate-limit-store";
import { requireAuth, AuthError, authErrorResponse } from "@/lib/auth";
import { verifyRecaptcha } from "@/lib/recaptcha";
import { getSql, withTransaction } from "@/lib/db";
import { sendReservationConfirmation, sendReservationAlert } from "@/lib/email";
import { coerceGlobalSettings, isValidBooking } from "@/lib/schedule";

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

// Menu price/availability cache moved to @/lib/menu-cache so admin write
// paths can invalidate it after a successful mutation (avoids serving stale
// prices for up to PRICE_CACHE_TTL_MS = 60s after an admin price change).


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

  // Load schedule + closures from settings.global / settings.closures. Both
  // reads are best-effort: a transient DB hiccup falls back to defaults rather
  // than rejecting the order. The reservation transaction below re-reads what
  // it strictly needs (welcome offer flag) inside its FOR UPDATE block.
  //
  // Fail CLOSED on settings read errors: if Postgres is briefly unreachable we
  // do NOT silently fall back to the default schedule, because the operator's
  // real schedule may be very different (closed days, different hours). A
  // permissive fallback risks accepting orders for moments the kitchen is
  // closed, which is exactly the kind of silent money/UX failure that prompted
  // the dynamic-schedule feature. Reservations get retried by the customer
  // once Postgres is back; everything else (auth, payments) is still up.
  let scheduleSettings: ReturnType<typeof coerceGlobalSettings>;
  let blockedDates: string[] = [];
  try {
    const sql = getSql();
    const settingRows = await sql<{ key: string; value: unknown }[]>`
      SELECT key, value FROM settings WHERE key IN ('global', 'closures')
    `;
    let foundGlobal = false;
    let globalValue: unknown = null;
    for (const row of settingRows) {
      if (row.key === "global") {
        foundGlobal = true;
        globalValue = row.value;
      } else if (row.key === "closures") {
        const v = row.value as { blockedDates?: unknown } | null;
        if (v && Array.isArray(v.blockedDates)) {
          blockedDates = v.blockedDates.filter((d): d is string => typeof d === "string");
        }
      }
    }
    // settings.global is seeded at install time + by migration 004. Its
    // absence is therefore a real anomaly, not "fresh install" — we still
    // accept and use defaults for it (so the route doesn't hard-fail when the
    // closures row alone exists), but log loudly.
    if (!foundGlobal) {
      console.warn("SETTINGS_GLOBAL_MISSING_USING_DEFAULTS");
    }
    scheduleSettings = coerceGlobalSettings(globalValue);
  } catch (e) {
    // Structured payload makes prod post-mortems trivial — grep for
    // SETTINGS_READ_FAILED and you immediately see whether Postgres was the
    // root cause (vs a transient network glitch, vs missing settings row).
    console.error("SETTINGS_READ_FAILED", {
      uid: claims.sub,
      stage: "pre-tx settings + closures fetch",
      code: (e as { code?: string })?.code ?? "unknown",
      msg: (e as { message?: string })?.message ?? "unknown",
    });
    return bad("Service temporairement indisponible, réessayez dans un instant.", 503);
  }

  if (blockedDates.includes(date)) {
    return bad("Désolé, le restaurant est fermé exceptionnellement à cette date.");
  }

  if (!slot) return bad("Créneau invalide.");

  // Dynamic enforcement: opening day, slot membership, lead time. The error
  // string surfaces directly to the customer (already French, sanitized).
  const check = isValidBooking({ date, slot, settings: scheduleSettings });
  if (!check.ok) {
    return bad(check.reason);
  }

  const deliveryMode: "retrait" | "livraison" =
    payload.deliveryMode === "livraison" ? "livraison" : "retrait";

  const MENU_BY_ID = await getMenuById();
  let serverSubtotal = 0;
  const sanitizedItems: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
    flavor: string | null;
    image: string;
  }> = [];

  for (const item of items) {
    const id = clean(item.id, 60);
    const qty = item.quantity;
    const entry = MENU_BY_ID[id];
    if (!id || !entry) {
      return bad(`Article inconnu: ${id || "(vide)"}`);
    }
    if (!entry.available) {
      return bad(`Article non disponible: ${clean(item.name, 80) || id}`);
    }
    if (typeof qty !== "number" || !Number.isInteger(qty) || qty < 1 || qty > MAX_QUANTITY) {
      return bad("Quantité invalide.");
    }

    // Apply flavor supplement server-side (client could lie about price).
    const requestedFlavor = item.flavor ? clean(item.flavor, 250) : null;
    let flavorSupplement = 0;
    let chosenFlavor: string | null = null;
    if (requestedFlavor) {
      if (entry.flavors && entry.flavors.length > 0) {
        const match = entry.flavors.find((f) => f.name === requestedFlavor);
        if (!match) {
          return bad(`Saveur invalide pour ${clean(item.name, 80) || id}.`);
        }
        flavorSupplement = match.supplement;
        chosenFlavor = match.name;
      } else {
        // Items without predefined flavors (like Formules) use this field
        // to pass their composition string. Accept it without supplement.
        chosenFlavor = requestedFlavor;
      }
    }

    const unitPrice = round2(entry.price + flavorSupplement);
    serverSubtotal += unitPrice * qty;

    sanitizedItems.push({
      id,
      name: clean(item.name, 100) || "Plat",
      price: unitPrice,
      quantity: qty,
      flavor: chosenFlavor,
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

  // -------------------------------------------------------------------------
  // Idempotency: the client passes an Idempotency-Key header (random UUID
  // generated once per submit attempt). If we already have an order for this
  // (user_id, idempotency_key) pair, return it as-is — same response shape as
  // the original submission. Prevents double-orders from network retries,
  // browser back+resubmit, or two open tabs.
  //
  // We accept a missing header (legacy clients) but log it — future versions
  // can make it required once all clients are updated.
  // -------------------------------------------------------------------------
  const idempotencyKey = request.headers
    .get("idempotency-key")
    ?.trim()
    .slice(0, 200) || null;

  if (idempotencyKey) {
    try {
      const sqlPre = getSql();
      const existing = await sqlPre<
        { id: string; reference: string; subtotal: string | number; delivery_fee: string | number; total: string | number; deposit_amount: string | number }[]
      >`
        SELECT id, reference, subtotal, delivery_fee, total, deposit_amount
        FROM orders
        WHERE user_id = ${userId} AND idempotency_key = ${idempotencyKey}
        LIMIT 1
      `;
      if (existing.length > 0) {
        const e = existing[0];
        return NextResponse.json({
          ok: true,
          reference: e.reference,
          orderId: e.id,
          serverSubtotal: Number(e.subtotal),
          deliveryFee: Number(e.delivery_fee),
          total: Number(e.total),
          depositAmount: Number(e.deposit_amount),
          replayed: true,
        });
      }
    } catch (e) {
      // If the lookup fails (DB hiccup) we proceed and let the unique index
      // catch a real collision below — fail-open here is acceptable since
      // the unique constraint is the authoritative guard.
      console.warn("IDEMPOTENCY_LOOKUP_FAILED", (e as { code?: string }).code ?? "unknown");
    }
  }

  // Generate a reference. With ~16M possible 8-hex suffixes per day, collisions
  // are vanishingly rare but non-zero — we retry once on a unique_violation.
  let reference = generateReference();

  try {
    let finalTotal = serverTotalBeforeDiscount;
    let finalDeposit = 0;
    let orderId = "";
    // Captured inside the transaction for the post-commit notification emails.
    let notifyName = "";
    let notifyEmail = "";

    // Retry the whole transaction up to 2 times on a unique_violation that
    // targets orders.reference — collisions are vanishingly rare (8 hex chars
    // = ~16M / day) but a real outage of randomness or two requests landing
    // on the same suffix should not become a 500.
    let attempt = 0;
    while (true) {
      attempt++;
      try {
        await withTransactionImpl();
        break;
      } catch (txError: unknown) {
        const pgErr = txError as { code?: string; constraint_name?: string };
        const isReferenceCollision =
          pgErr?.code === "23505" &&
          (pgErr.constraint_name === "orders_reference_key" ||
            String((txError as { message?: string })?.message ?? "").includes(
              "orders_reference_key",
            ));
        const isIdempotencyCollision =
          pgErr?.code === "23505" &&
          String((txError as { message?: string })?.message ?? "").includes(
            "orders_user_idempotency_key_idx",
          );
        if (isIdempotencyCollision) {
          // Concurrent submission with the same idempotency key already
          // succeeded. Re-read the existing row and return it as a replay.
          const sqlR = getSql();
          const existing = await sqlR<
            {
              id: string;
              reference: string;
              subtotal: string | number;
              delivery_fee: string | number;
              total: string | number;
              deposit_amount: string | number;
            }[]
          >`
            SELECT id, reference, subtotal, delivery_fee, total, deposit_amount
            FROM orders
            WHERE user_id = ${userId} AND idempotency_key = ${idempotencyKey}
            LIMIT 1
          `;
          if (existing.length > 0) {
            const e = existing[0];
            return NextResponse.json({
              ok: true,
              reference: e.reference,
              orderId: e.id,
              serverSubtotal: Number(e.subtotal),
              deliveryFee: Number(e.delivery_fee),
              total: Number(e.total),
              depositAmount: Number(e.deposit_amount),
              replayed: true,
            });
          }
          throw txError;
        }
        if (isReferenceCollision && attempt < 3) {
          reference = generateReference();
          continue;
        }
        throw txError;
      }
    }

    async function withTransactionImpl() {
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

      // Check the admin-controlled global settings (default-on if missing or
      // the row hasn't been seeded). When admin toggles isWelcomeOfferActive
      // off, the -5€ discount must stop applying server-side regardless of
      // what the client says.
      const globalSettingsRow = await tx<
        { value: { isWelcomeOfferActive?: unknown } | null }[]
      >`SELECT value FROM settings WHERE key = 'global' LIMIT 1`;
      const isWelcomeOfferActive =
        globalSettingsRow[0]?.value?.isWelcomeOfferActive !== false;

      // Logic des réductions
      const welcomeDiscount =
        isWelcomeOfferActive && !hasUsedWelcomeOffer && ordersCount === 0 ? 5 : 0;
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
        welcomeOffer: actualWelcomeDiscount > 0,
        referralCodeUsed: cleanedReferralCode,
        promoCodeUsed: promoCodeUsed || null,
        promoDiscount: promoDiscount > 0 ? promoDiscount : null,
      };

      // Resolve the referrer for THIS order. The +5€ reward fires on the
      // delivery of the order whose referrer_id is set. We want it to fire
      // exactly once per referred customer, on their first order — regardless
      // of whether the referral code was entered at SIGNUP (-> users.referred_by)
      // or on the order itself.
      //
      // referrer_id is the ONLY trusted population path; clients cannot set it.
      // The whole block runs under the SELECT ... FOR UPDATE lock on the user
      // row, so two concurrent first orders are serialized (no double-attach).
      let referrerId: string | null = null;
      // Candidate: prefer the signup referral, else resolve the order's code.
      let candidateReferrer: string | null = userData.referred_by;
      if (!candidateReferrer && cleanedReferralCode) {
        const referrerRows = await tx<{ id: string }[]>`
          SELECT id FROM users WHERE referral_code = ${cleanedReferralCode} LIMIT 1
        `;
        if (referrerRows.length > 0) {
          candidateReferrer = referrerRows[0].id;
        }
      }
      // Self-referral guard.
      if (candidateReferrer === userId) candidateReferrer = null;
      // Once-per-referred-customer: only attach the referrer to the FIRST order
      // that would carry one. If an earlier order already has a referrer_id,
      // this user has already generated (or will generate) the single reward.
      if (candidateReferrer) {
        const prior = await tx<{ one: number }[]>`
          SELECT 1 AS one FROM orders
          WHERE user_id = ${userId} AND referrer_id IS NOT NULL
          LIMIT 1
        `;
        if (prior.length === 0) {
          referrerId = candidateReferrer;
        }
      }

      const userName = userData.name || `${customer.firstName} ${customer.lastName}`;
      const userEmail = (userData.email || customer.email || "").trim().toLowerCase();
      notifyName = userName;
      notifyEmail = userEmail;

      // Insert order. status defaults to 'Attente Acompte' at the column level
      // but we set it explicitly to mirror the previous Firestore write.
      // Includes the optional idempotency_key so a same-key retry returns the
      // existing order via the partial unique index instead of creating a
      // duplicate (the route's pre-tx lookup already short-circuits that path,
      // this is belt-and-suspenders).
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
          referrer_id,
          idempotency_key
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
          ${referrerId},
          ${idempotencyKey}
        )
        RETURNING id
      `;
      orderId = orderRows[0].id;

      // Update user: optionally flip welcome offer, decrement referral
      // credits, and set referred_by only if not already set.
      //
      // NOTE: orders_count is intentionally NOT incremented here. It is the
      // loyalty counter and is incremented exactly once, on the
      // non-Livré -> Livré transition (in /api/delivery/confirm and the admin
      // PATCH). Incrementing both at creation and on delivery double-counted
      // every completed order. The welcome-offer "first order" guarantee does
      // NOT depend on this increment — it is enforced atomically by
      // has_used_welcome_offer under the row lock above.
      await tx`
        UPDATE users
        SET
          has_used_welcome_offer = (${actualWelcomeDiscount > 0} OR has_used_welcome_offer),
          referral_credits = referral_credits - ${creditsToUse},
          referred_by = COALESCE(referred_by, ${referrerId}),
          updated_at = now()
        WHERE id = ${userId}
      `;
    });
    }

    console.log("[Afro Miaam] Réservation confirmée et stockée", { orderId, reference, finalTotal });

    // Notification emails — fire-and-forget. The order is already committed;
    // a mail failure (Resend down, missing key in dev) must NOT fail the
    // request. Each sender already swallows its own errors, but we also guard
    // here so an unexpected throw never bubbles into the response.
    void (async () => {
      try {
        if (notifyEmail) {
          await sendReservationConfirmation(
            notifyEmail,
            notifyName,
            reference,
            finalTotal,
            date,
            slot,
          );
        }
        const restaurantEmail = process.env.RESTAURANT_EMAIL;
        if (restaurantEmail) {
          await sendReservationAlert(
            restaurantEmail,
            notifyName,
            reference,
            finalTotal,
            sanitizedItems.map((i) => ({ name: i.name, quantity: i.quantity })),
          );
        }
      } catch (e) {
        console.warn("RESERVATION_EMAIL_FAILED", (e as { message?: string })?.message ?? "unknown");
      }
    })();

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
    // Structured: lets ops distinguish business-rule rejections (safe=true)
    // from real DB errors (isDbError) when grepping prod logs.
    console.error("TRANSACTION_FAILED", {
      uid: claims.sub,
      ref: reference,
      mode: deliveryMode,
      isDbError,
      safe,
      code: (error as { code?: string })?.code ?? "unknown",
      msg,
    });
    if (safe) return bad(msg, 400);
    return bad("Erreur lors de la validation et l'insertion de la commande.", 500);
  }
}
