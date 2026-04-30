import { NextResponse } from "next/server";

type Payload = {
  items?: unknown[];
  date?: string;
  slot?: string;
  deliveryMode?: "retrait" | "livraison";
  customer?: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    email?: string;
    address?: string;
    notes?: string;
  };
};

function generateReference(): string {
  const date = new Date();
  const ymd = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(
    date.getDate(),
  ).padStart(2, "0")}`;
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `AM-${ymd}-${rand}`;
}

export async function POST(request: Request) {
  let payload: Payload;
  try {
    payload = (await request.json()) as Payload;
  } catch {
    return NextResponse.json({ error: "Format JSON invalide." }, { status: 400 });
  }

  const items = Array.isArray(payload.items) ? payload.items : [];
  if (items.length === 0) {
    return NextResponse.json({ error: "Le panier est vide." }, { status: 400 });
  }

  const customer = payload.customer || {};
  if (!customer.firstName || !customer.lastName || !customer.phone) {
    return NextResponse.json(
      { error: "Nom, prénom et téléphone sont requis." },
      { status: 400 },
    );
  }

  if (!payload.date || !payload.slot) {
    return NextResponse.json(
      { error: "Date et créneau sont requis." },
      { status: 400 },
    );
  }

  if (payload.deliveryMode === "livraison" && !customer.address) {
    return NextResponse.json(
      { error: "Adresse de livraison requise." },
      { status: 400 },
    );
  }

  const reference = generateReference();

  // TODO: brancher l'envoi email/SMS/Sheets/Notion ici.
  // Pour l'instant, on log côté serveur pour traçabilité MVP.
  console.log("[Afro Miaam] Nouvelle réservation", {
    reference,
    date: payload.date,
    slot: payload.slot,
    deliveryMode: payload.deliveryMode,
    customer,
    itemCount: items.length,
  });

  return NextResponse.json({ ok: true, reference });
}
