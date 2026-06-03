import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";
import { requireAdmin, authErrorResponse } from "@/lib/auth";

/**
 * PATCH /api/admin/orders/[id] — admin-only order update.
 *
 * Allows the admin to flip status (whitelisted) and toggle the
 * deletion_requested marker. Setting status to 'Livré' here bypasses the
 * QR-code delivery flow — intentional admin override.
 */

export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 32 * 1024;
const ALLOWED_STATUS = new Set([
  "Attente Acompte",
  "Acompte Reçu",
  "En attente",
  "En cours",
  "Livré",
]);

type OrderRow = {
  id: string;
  reference: string;
  user_id: string | null;
  user_name: string | null;
  user_email: string | null;
  items: unknown;
  subtotal: string | number;
  delivery_fee: string | number;
  total: string | number;
  deposit_amount: string | number;
  discounts: unknown;
  status: string;
  customer: unknown;
  referrer_id: string | null;
  referral_reward_paid: boolean;
  has_reviewed: boolean;
  review: unknown;
  delivery_token_hash: string | null;
  delivery_token_exp: string | number | null;
  delivered_at: Date | null;
  deletion_requested: boolean;
  created_at: Date;
  updated_at: Date;
};

function toNumber(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  return typeof value === "number" ? value : Number(value);
}

function mapOrder(row: OrderRow) {
  return {
    id: row.id,
    reference: row.reference,
    userId: row.user_id,
    userName: row.user_name,
    userEmail: row.user_email,
    items: row.items,
    subtotal: toNumber(row.subtotal),
    deliveryFee: toNumber(row.delivery_fee),
    total: toNumber(row.total),
    depositAmount: toNumber(row.deposit_amount),
    discounts: row.discounts,
    status: row.status,
    customer: row.customer,
    referrerId: row.referrer_id,
    referralRewardPaid: row.referral_reward_paid,
    hasReviewed: row.has_reviewed,
    review: row.review,
    deliveryTokenHash: row.delivery_token_hash,
    deliveryTokenExp:
      row.delivery_token_exp === null || row.delivery_token_exp === undefined
        ? null
        : typeof row.delivery_token_exp === "number"
          ? row.delivery_token_exp
          : Number(row.delivery_token_exp),
    deliveredAt: row.delivered_at,
    deletionRequested: row.deletion_requested,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function bad(error: string, status = 400) {
  return NextResponse.json(
    { error },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin(request);
  } catch (e) {
    return authErrorResponse(e);
  }

  const { id } = await context.params;
  if (!id || typeof id !== "string" || id.includes("/")) {
    return bad("Identifiant invalide.");
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

  let payload: { status?: unknown; deletionRequested?: unknown };
  try {
    payload = raw ? JSON.parse(raw) : {};
  } catch {
    return bad("Format JSON invalide.");
  }

  let nextStatus: string | null = null;
  if (payload.status !== undefined) {
    if (typeof payload.status !== "string" || !ALLOWED_STATUS.has(payload.status)) {
      return bad("Statut invalide.");
    }
    nextStatus = payload.status;
  }

  let nextDeletionRequested: boolean | null = null;
  if (payload.deletionRequested !== undefined) {
    if (typeof payload.deletionRequested !== "boolean") {
      return bad("Champ deletionRequested invalide.");
    }
    nextDeletionRequested = payload.deletionRequested;
  }

  if (nextStatus === null && nextDeletionRequested === null) {
    return bad("Aucun champ à mettre à jour.");
  }

  const sql = getSql();
  const rows = await sql<OrderRow[]>`
    UPDATE orders
    SET status = COALESCE(${nextStatus}, status),
        deletion_requested = COALESCE(${nextDeletionRequested}, deletion_requested),
        updated_at = now()
    WHERE id = ${id}
    RETURNING id, reference, user_id, user_name, user_email, items,
              subtotal, delivery_fee, total, deposit_amount, discounts,
              status, customer, referrer_id, referral_reward_paid,
              has_reviewed, review, delivery_token_hash, delivery_token_exp,
              delivered_at, deletion_requested, created_at, updated_at
  `;

  if (rows.length === 0) {
    return bad("Commande introuvable.", 404);
  }

  return NextResponse.json(
    { ok: true, order: mapOrder(rows[0]) },
    { headers: { "Cache-Control": "no-store" } },
  );
}

/**
 * DELETE /api/admin/orders/[id] — admin permanently deletes an order.
 * If the order was already 'Livré', decrement the owner's orders_count to keep
 * loyalty counters consistent.
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin(request);
    const { id } = await params;
    const sql = getSql();
    const rows = await sql<OrderRow[]>`
      DELETE FROM orders WHERE id = ${id}
      RETURNING id, reference, user_id, user_name, user_email, items,
                subtotal, delivery_fee, total, deposit_amount, discounts,
                status, customer, referrer_id, referral_reward_paid,
                has_reviewed, review, delivery_token_hash, delivery_token_exp,
                delivered_at, deletion_requested, created_at, updated_at
    `;
    if (rows.length === 0) {
      return bad("Commande introuvable.", 404);
    }
    const row = rows[0];
    if (row.status === "Livré" && row.user_id) {
      await sql`
        UPDATE users
        SET orders_count = GREATEST(orders_count - 1, 0), updated_at = now()
        WHERE id = ${row.user_id}
      `;
    }
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return authErrorResponse(e);
  }
}
