import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const RESTAURANT_EMAIL = process.env.RESTAURANT_EMAIL ?? "bonjour@afro-miaam.fr";
const FROM_EMAIL = "Afro Miaam <commandes@afro-miaam.fr>";

type ReservationEmailParams = {
  reference: string;
  date: string;
  slot: string;
  deliveryMode: "retrait" | "livraison";
  subtotal: number;
  deliveryFee: number;
  total: number;
  items: Array<{ name: string; quantity: number; price: number }>;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  customerAddress: string | null;
  customerNotes: string | null;
};

function formatEUR(cents: number): string {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(cents);
}

export async function sendReservationNotification(p: ReservationEmailParams): Promise<void> {
  if (!resend) {
    console.warn("[email] RESEND_API_KEY not set — skipping email notification.");
    return;
  }

  const itemsHtml = p.items
    .map((i) => `<tr><td>${i.quantity} × ${i.name}</td><td>${formatEUR(i.price * i.quantity)}</td></tr>`)
    .join("");

  const deliveryLabel = p.deliveryMode === "livraison"
    ? `Livraison à Lyon${p.customerAddress ? ` — ${p.customerAddress}` : ""}`
    : "Retrait sur place";

  const restaurantHtml = `
    <h2>Nouvelle commande — ${p.reference}</h2>
    <p><strong>Client :</strong> ${p.customerName} — ${p.customerPhone}${p.customerEmail ? ` — ${p.customerEmail}` : ""}</p>
    <p><strong>Date / Créneau :</strong> ${p.date} à ${p.slot}</p>
    <p><strong>Mode :</strong> ${deliveryLabel}</p>
    <table border="1" cellpadding="4" style="border-collapse:collapse">
      <thead><tr><th>Article</th><th>Montant</th></tr></thead>
      <tbody>${itemsHtml}</tbody>
      <tfoot>
        <tr><td>Sous-total</td><td>${formatEUR(p.subtotal)}</td></tr>
        <tr><td>Livraison</td><td>${p.deliveryFee === 0 ? "Gratuit" : formatEUR(p.deliveryFee)}</td></tr>
        <tr><td><strong>Total</strong></td><td><strong>${formatEUR(p.total)}</strong></td></tr>
      </tfoot>
    </table>
    ${p.customerNotes ? `<p><strong>Note :</strong> ${p.customerNotes}</p>` : ""}
  `;

  const promises: Promise<unknown>[] = [
    resend.emails.send({
      from: FROM_EMAIL,
      to: RESTAURANT_EMAIL,
      subject: `[Afro Miaam] Nouvelle commande ${p.reference} — ${p.date} ${p.slot}`,
      html: restaurantHtml,
    }),
  ];

  if (p.customerEmail) {
    const customerHtml = `
      <h2>Votre commande Afro Miaam est bien reçue !</h2>
      <p>Bonjour ${p.customerName.split(" ")[0]},</p>
      <p>Votre commande <strong>${p.reference}</strong> a été enregistrée pour le <strong>${p.date} à ${p.slot}</strong>.</p>
      <p>Mode : ${deliveryLabel}</p>
      <p>Total : <strong>${formatEUR(p.total)}</strong></p>
      <p>Notre équipe vous appellera au <strong>${p.customerPhone}</strong> pour finaliser et confirmer le paiement.</p>
      <p>À très vite,<br>L'équipe Afro Miaam</p>
    `;

    promises.push(
      resend.emails.send({
        from: FROM_EMAIL,
        to: p.customerEmail,
        subject: `Votre commande Afro Miaam — ${p.reference}`,
        html: customerHtml,
      }),
    );
  }

  const results = await Promise.allSettled(promises);
  for (const r of results) {
    if (r.status === "rejected") {
      console.error("[email] Send failed:", r.reason);
    }
  }
}
