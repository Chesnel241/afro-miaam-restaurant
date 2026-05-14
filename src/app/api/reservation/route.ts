import { NextResponse } from "next/server";
import { menuItems } from "@/data/menu";
import { DELIVERY_FEE } from "@/lib/booking";

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
const PRICE_BY_ID: Record<string, number> = Object.fromEntries(
  menuItems.map((i) => [i.id, i.price]),
);

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

  // Date côté serveur : J+1 minimum
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const requested = new Date(date + "T00:00:00");
  if (requested.getTime() < today.getTime() + 24 * 3600 * 1000) {
    return bad("Réservation minimum 24h à l'avance.");
  }

  const deliveryMode: "retrait" | "livraison" =
    payload.deliveryMode === "livraison" ? "livraison" : "retrait";

  // Recalcul du total côté serveur à partir du menu officiel
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

  // Si le client a envoyé un total, on tolère ≤ serverTotal (le client peut avoir des
  // remises crédits/welcome offer non vérifiables ici sans Admin SDK). On rejette tout
  // total > serveur ou ≤ 0.
  let clientTotal = serverTotalBeforeDiscount;
  if (payload.total !== undefined) {
    if (typeof payload.total !== "number" || !Number.isFinite(payload.total)) {
      return bad("Total invalide.");
    }
    if (payload.total > serverTotalBeforeDiscount + 0.01) {
      return bad("Total incohérent avec les prix du menu.");
    }
    if (payload.total < 0) {
      return bad("Total négatif refusé.");
    }
    clientTotal = round2(payload.total);
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
