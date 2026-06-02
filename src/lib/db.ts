import postgres from "postgres";

const isBuild = process.env.NEXT_PHASE === "phase-production-build";

// During next build there is no DB — return a stub that never executes.
// At runtime DATABASE_URL must be set via the .env file on the VPS.
const sql = isBuild
  ? (null as unknown as ReturnType<typeof postgres>)
  : postgres(process.env.DATABASE_URL!, {
      max: 10,
      idle_timeout: 20,
      connect_timeout: 10,
    });

export default sql;

export type ReservationInsert = {
  reference: string;
  date: string;
  slot: string;
  deliveryMode: "retrait" | "livraison";
  subtotal: number;
  deliveryFee: number;
  total: number;
  itemsJson: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  customerAddress: string | null;
  customerNotes: string | null;
};

export async function insertReservation(r: ReservationInsert): Promise<void> {
  await sql`
    INSERT INTO reservations (
      reference, date, slot, delivery_mode,
      subtotal, delivery_fee, total, items_json,
      customer_name, customer_phone, customer_email,
      customer_address, customer_notes
    ) VALUES (
      ${r.reference}, ${r.date}, ${r.slot}, ${r.deliveryMode},
      ${r.subtotal}, ${r.deliveryFee}, ${r.total}, ${r.itemsJson}::jsonb,
      ${r.customerName}, ${r.customerPhone}, ${r.customerEmail ?? null},
      ${r.customerAddress ?? null}, ${r.customerNotes ?? null}
    )
  `;
}
