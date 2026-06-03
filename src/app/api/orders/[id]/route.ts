import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";
import { requireAuth, authErrorResponse } from "@/lib/auth";

/**
 * GET /api/orders/[id] — authenticated.
 *
 * Returns a single order, with ownership enforced server-side: admin OR
 * order.user_id === claims.sub OR (claims.email_verified && lower email match).
 * Delivery token hash masked for non-admin.
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

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  let claims;
  try {
    claims = await requireAuth(request);
  } catch (e) {
    return authErrorResponse(e);
  }

  const { id } = await context.params;
  if (!id || typeof id !== "string" || id.includes("/")) {
    return NextResponse.json(
      { error: "Identifiant invalide." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const sql = getSql();
  const rows = await sql<OrderRow[]>`
    SELECT id, reference, user_id, user_name, user_email, items,
           subtotal, delivery_fee, total, deposit_amount, discounts,
           status, customer, referrer_id, referral_reward_paid,
           has_reviewed, review, delivery_token_hash, delivery_token_exp,
           delivered_at, created_at, updated_at
    FROM orders
    WHERE id = ${id}
    LIMIT 1
  `;

  if (rows.length === 0) {
    return NextResponse.json(
      { error: "Commande introuvable." },
      { status: 404, headers: { "Cache-Control": "no-store" } },
    );
  }

  const order = rows[0];
  const isAdmin = claims.role === "admin";
  const isOwnerByUid = order.user_id !== null && order.user_id === claims.sub;
  const userEmail = (claims.email || "").trim().toLowerCase();
  const orderEmail = (order.user_email || "").trim().toLowerCase();
  const isOwnerByEmail =
    claims.email_verified === true &&
    orderEmail.length > 0 &&
    orderEmail === userEmail;

  if (!isAdmin && !isOwnerByUid && !isOwnerByEmail) {
    return NextResponse.json(
      { error: "Action non autorisée." },
      { status: 403, headers: { "Cache-Control": "no-store" } },
    );
  }

  return NextResponse.json(
    { ok: true, order: mapOrder(order, isAdmin) },
    { headers: { "Cache-Control": "no-store" } },
  );
}
