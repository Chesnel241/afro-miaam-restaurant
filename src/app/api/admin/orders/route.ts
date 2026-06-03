import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";
import { requireAdmin, authErrorResponse } from "@/lib/auth";

/**
 * GET /api/admin/orders — admin-only full order list (newest first, 500 max).
 *
 * Returns the same camelCase shape as /api/orders, with delivery token hash
 * included (admins legitimately need it for the QR-confirm flow).
 */

export const dynamic = "force-dynamic";

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

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
  } catch (e) {
    return authErrorResponse(e);
  }

  const sql = getSql();
  const rows = await sql<OrderRow[]>`
    SELECT id, reference, user_id, user_name, user_email, items,
           subtotal, delivery_fee, total, deposit_amount, discounts,
           status, customer, referrer_id, referral_reward_paid,
           has_reviewed, review, delivery_token_hash, delivery_token_exp,
           delivered_at, deletion_requested, created_at, updated_at
    FROM orders
    ORDER BY created_at DESC
    LIMIT 500
  `;

  return NextResponse.json(
    { ok: true, orders: rows.map(mapOrder) },
    { headers: { "Cache-Control": "no-store" } },
  );
}
