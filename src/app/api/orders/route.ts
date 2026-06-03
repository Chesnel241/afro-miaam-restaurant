import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";
import { requireAuth, authErrorResponse } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit-store";

/**
 * GET /api/orders — authenticated, polled by OrderContext.
 *
 * Admins see every order (newest first, last 500). Other users see only
 * their own orders, matched by user_id OR (verified email match). The
 * delivery token hash is NEVER returned to non-admin callers.
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
  created_at: Date;
  updated_at: Date;
};

function toNumber(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  return typeof value === "number" ? value : Number(value);
}

function mapOrder(row: OrderRow, isAdmin: boolean) {
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
    deliveryTokenHash: isAdmin ? row.delivery_token_hash : null,
    deliveryTokenExp:
      row.delivery_token_exp === null || row.delivery_token_exp === undefined
        ? null
        : typeof row.delivery_token_exp === "number"
          ? row.delivery_token_exp
          : Number(row.delivery_token_exp),
    deliveredAt: row.delivered_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function GET(request: Request) {
  let claims;
  try {
    claims = await requireAuth(request);
  } catch (e) {
    return authErrorResponse(e);
  }

  if (!(await checkRateLimit(`orders:uid:${claims.sub}`, 60, 60_000))) {
    return NextResponse.json(
      { error: "Trop de requêtes. Réessayez dans une minute." },
      { status: 429, headers: { "Cache-Control": "no-store" } },
    );
  }

  const sql = getSql();
  const isAdmin = claims.role === "admin";

  let rows: OrderRow[];
  if (isAdmin) {
    rows = await sql<OrderRow[]>`
      SELECT id, reference, user_id, user_name, user_email, items,
             subtotal, delivery_fee, total, deposit_amount, discounts,
             status, customer, referrer_id, referral_reward_paid,
             has_reviewed, review, delivery_token_hash, delivery_token_exp,
             delivered_at, created_at, updated_at
      FROM orders
      ORDER BY created_at DESC
      LIMIT 500
    `;
  } else {
    const emailLower = (claims.email || "").trim().toLowerCase();
    const emailVerified = claims.email_verified === true;
    rows = await sql<OrderRow[]>`
      SELECT id, reference, user_id, user_name, user_email, items,
             subtotal, delivery_fee, total, deposit_amount, discounts,
             status, customer, referrer_id, referral_reward_paid,
             has_reviewed, review, delivery_token_hash, delivery_token_exp,
             delivered_at, created_at, updated_at
      FROM orders
      WHERE user_id = ${claims.sub}
         OR (${emailVerified} AND lower(user_email) = ${emailLower})
      ORDER BY created_at DESC
      LIMIT 100
    `;
  }

  return NextResponse.json(
    { ok: true, orders: rows.map((row) => mapOrder(row, isAdmin)) },
    { headers: { "Cache-Control": "no-store" } },
  );
}
