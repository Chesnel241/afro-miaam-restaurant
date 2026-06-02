import { NextResponse } from "next/server";
import { insertReservation } from "@/lib/db";
import { sendReservationNotification } from "@/lib/email";

type Payload = {
  items?: Array<{ id?: string; name?: string; price?: number; quantity?: number }>;
  date?: string;
  slot?: string;
  deliveryMode?: "retrait" | "livraison";
  subtotal?: number;
  deliveryFee?: number;
  total?: number;
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
const FIELD_LIMITS = {
  firstName: 80,
  lastName: 80,
  phone: 32,
  email: 120,
  address: 200,
  notes: 600,
};
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function bad(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}

function clean(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "").trim().slice(0, max);
}

function generateReference(): string {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `AM-${ymd}-${rand}`;
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
  if (raw.length > MAX_BODY_BYTES) return bad("Requête trop volumineuse.", 413);

  let payload: Payload;
  try {
    payload = JSON.parse(raw) as Payload;
  } catch {
    return bad("Format JSON invalide.");
  }

  const items = Array.isArray(payload.items) ? payload.items : [];
  if (items.length === 0) return bad("Le panier est vide.");
  if (items.length > MAX_ITEMS) return bad("Trop d'articles dans le panier.");

  const date = clean(payload.date, 10);
  const slot = clean(payload.slot, 32);
  if (!ISO_DATE_RE.test(date)) return bad("Date invalide.");
  if (!slot) return bad("Créneau invalide.");

  const deliveryMode: "retrait" | "livraison" =
    payload.deliveryMode === "livraison" ? "livraison" : "retrait";

  const subtotal = typeof payload.subtotal === "number" ? payload.subtotal : 0;
  const deliveryFee = typeof payload.deliveryFee === "number" ? payload.deliveryFee : 0;
  const total = typeof payload.total === "number" ? payload.total : subtotal + deliveryFee;

  const c = payload.customer ?? {};
  const customer = {
    firstName: clean(c.firstName, FIELD_LIMITS.firstName),
    lastName: clean(c.lastName, FIELD_LIMITS.lastName),
    phone: clean(c.phone, FIELD_LIMITS.phone),
    email: clean(c.email, FIELD_LIMITS.email),
    address: clean(c.address, FIELD_LIMITS.address),
    notes: clean(c.notes, FIELD_LIMITS.notes),
  };

  if (!customer.firstName || !customer.lastName) return bad("Nom et prénom sont requis.");
  if (customer.phone.replace(/\D/g, "").length < 8) return bad("Numéro de téléphone invalide.");
  if (deliveryMode === "livraison" && customer.address.length < 6) return bad("Adresse de livraison requise.");
  if (customer.email && !customer.email.includes("@")) return bad("Email invalide.");

  const reference = generateReference();

  // Persist to database (fail loudly — the client must know if the order wasn't saved).
  try {
    await insertReservation({
      reference,
      date,
      slot,
      deliveryMode,
      subtotal,
      deliveryFee,
      total,
      itemsJson: JSON.stringify(items),
      customerName: `${customer.firstName} ${customer.lastName}`,
      customerPhone: customer.phone,
      customerEmail: customer.email || null,
      customerAddress: customer.address || null,
      customerNotes: customer.notes || null,
    });
  } catch (err) {
    console.error("[reservation] DB insert failed:", err);
    return NextResponse.json({ error: "Erreur lors de l'enregistrement." }, { status: 503 });
  }

  // Send email notifications (fire-and-forget — don't fail the request on email error).
  sendReservationNotification({
    reference,
    date,
    slot,
    deliveryMode,
    subtotal,
    deliveryFee,
    total,
    items: items.map((i) => ({
      name: typeof i.name === "string" ? i.name : "Article",
      quantity: typeof i.quantity === "number" ? i.quantity : 1,
      price: typeof i.price === "number" ? i.price : 0,
    })),
    customerName: `${customer.firstName} ${customer.lastName}`,
    customerPhone: customer.phone,
    customerEmail: customer.email || null,
    customerAddress: customer.address || null,
    customerNotes: customer.notes || null,
  }).catch((err) => console.error("[reservation] Email send failed:", err));

  return NextResponse.json({ ok: true, reference });
}
