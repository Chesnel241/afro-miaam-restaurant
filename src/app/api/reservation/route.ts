import { NextResponse } from "next/server";
import { collection, getDocs } from "firebase/firestore";
import { menuItems } from "@/data/menu";
import { db } from "@/lib/firebase";
import { DELIVERY_FEE } from "@/lib/booking";
import { MAINTENANCE_MODE } from "@/lib/maintenance";

type ClientItem = {
  id?: unknown;
  quantity?: unknown;
};

type Payload = {
  items?: unknown[];
  date?: string;
  slot?: string;
  deliveryMode?: "retrait" | "livraison";
  total?: unknown;
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

// M-3 (pass 5): server-side whitelist of reservation slots. Must stay in sync
// with the dropdown options in app/reservation/page.tsx.
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

// H-2 (pass 5): in-memory rate limiter per IP. Survives within a warm
// serverless instance (~5 min on Vercel) so it mitigates burst floods.
// For full distributed rate limiting, swap this for Upstash KV.
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_HITS = 10;
const rateLimit = new Map<string, { hits: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimit.get(ip);
  if (!entry || entry.resetAt < now) {
    rateLimit.set(ip, { hits: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (entry.hits >= RATE_LIMIT_MAX_HITS) return false;
  entry.hits++;
  return true;
}

function clientIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}
const PRICE_CACHE_TTL_MS = 60_000;

// Static menu fallback in case Firestore is unreachable (e.g. App Check
// enforced on /menu reads server-side).
const STATIC_PRICE_BY_ID: Record<string, number> = Object.fromEntries(
  menuItems.map((i) => [i.id, i.price]),
);

let priceCache: { byId: Record<string, number>; expires: number } | null = null;

async function getPriceById(): Promise<Record<string, number>> {
  const now = Date.now();
  if (priceCache && now < priceCache.expires) return priceCache.byId;

  const byId: Record<string, number> = { ...STATIC_PRICE_BY_ID };
  try {
    const snap = await getDocs(collection(db, "menu"));
    snap.forEach((d) => {
      const data = d.data() as { price?: unknown; available?: unknown };
      const price = typeof data.price === "number" && data.price > 0 ? data.price : null;
      if (price !== null && data.available !== false) {
        byId[d.id] = price;
      }
    });
  } catch (e) {
    console.warn("MENU_FIRESTORE_READ_FAILED", (e as { code?: string }).code ?? "unknown");
  }

  priceCache = { byId, expires: now + PRICE_CACHE_TTL_MS };
  return byId;
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
  // Maintenance gate. The middleware lets /api/* through so we surface a real
  // JSON 503 here instead of an HTML redirect.
  if (MAINTENANCE_MODE) {
    return bad("Service temporairement indisponible (maintenance).", 503);
  }

  // H-2: simple per-IP rate limit (10 req / minute). In-memory; doesn't
  // survive across cold starts but mitigates burst floods on warm functions.
  if (!checkRateLimit(clientIp(request))) {
    return bad("Trop de requêtes. Réessayez dans une minute.", 429);
  }

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

  const items = Array.isArray(payload.items) ? (payload.items as ClientItem[]) : [];
  if (items.length === 0) return bad("Le panier est vide.");
  if (items.length > MAX_ITEMS) return bad("Trop d'articles dans le panier.");

  const date = clean(payload.date, 10);
  const slot = clean(payload.slot, 32);
  if (!ISO_DATE_RE.test(date)) return bad("Date invalide.");
  if (!slot) return bad("Créneau invalide.");
  // M-3: enforce slot whitelist server-side.
  if (!ALLOWED_SLOTS.has(slot)) return bad("Créneau non autorisé.");

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const requested = new Date(date + "T00:00:00");
  if (requested.getTime() < today.getTime() + 24 * 3600 * 1000) {
    return bad("Réservation minimum 24h à l'avance.");
  }

  const deliveryMode: "retrait" | "livraison" =
    payload.deliveryMode === "livraison" ? "livraison" : "retrait";

  // Server-authoritative price lookup from the Firestore menu (fallback static).
  const PRICE_BY_ID = await getPriceById();
  let serverSubtotal = 0;
  for (const item of items) {
    const id = clean(item.id, 60);
    const qty = item.quantity;
    if (!id || !(id in PRICE_BY_ID)) {
      return bad(`Article inconnu: ${id || "(vide)"}`);
    }
    if (typeof qty !== "number" || !Number.isInteger(qty) || qty < 1 || qty > MAX_QUANTITY) {
      return bad("Quantité invalide.");
    }
    serverSubtotal += PRICE_BY_ID[id] * qty;
  }

  const serverDeliveryFee = deliveryMode === "livraison" ? DELIVERY_FEE : 0;
  const serverTotalBeforeDiscount = round2(serverSubtotal + serverDeliveryFee);

  // The client may legitimately send a total LOWER than the server total when
  // a welcome offer or referral credits apply (we cannot verify those without
  // Admin SDK). Reject totals that are HIGHER than the server total or
  // negative; pass-through otherwise. Also reject NaN / non-finite.
  let clientTotal = serverTotalBeforeDiscount;
  if (payload.total !== undefined && payload.total !== null) {
    const t = Number(payload.total);
    if (!Number.isFinite(t)) {
      return bad("Total invalide.");
    }
    // M-1: also reject zero — the firestore.rule requires `total > 0` so a
    // zero total would crash later with a generic UI error. Surface a clear
    // 400 here. Minimum chargeable order: 0.01 €.
    if (t <= 0) {
      return bad("Le total doit être strictement positif (minimum 0,01 €).");
    }
    if (t > serverTotalBeforeDiscount + 0.01) {
      return bad("Total incohérent avec les prix du menu.");
    }
    clientTotal = round2(t);
  }

  const c = payload.customer || {};
  const customer = {
    firstName: clean(c.firstName, FIELD_LIMITS.firstName),
    lastName: clean(c.lastName, FIELD_LIMITS.lastName),
    phone: clean(c.phone, FIELD_LIMITS.phone),
    email: clean(c.email, FIELD_LIMITS.email),
    address: clean(c.address, FIELD_LIMITS.address),
    notes: clean(c.notes, FIELD_LIMITS.notes),
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
  const finalTotal = clientTotal;
  const finalDeposit = round2(finalTotal * 0.5);

  console.log("[Afro Miaam] Nouvelle réservation", {
    reference,
    date,
    slot,
    deliveryMode,
    itemCount: items.length,
    serverSubtotal,
    finalTotal,
  });

  return NextResponse.json({
    ok: true,
    reference,
    serverSubtotal: round2(serverSubtotal),
    deliveryFee: serverDeliveryFee,
    total: finalTotal,
    depositAmount: finalDeposit,
  });
}
