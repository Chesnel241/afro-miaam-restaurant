import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";
import { requireAdmin, authErrorResponse, type Role } from "@/lib/auth";

/**
 * GET /api/admin/users — admin-only.
 *
 * Lists active users (customer/admin) for the admin dashboard. Excludes
 * soft-deleted users (role = 'deleted') by virtue of the role filter.
 * Sensitive columns (password_hash, legacy_uid, tokens) are NEVER selected.
 */

export const dynamic = "force-dynamic";

type UserRow = {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  role: Role;
  referral_code: string;
  referral_credits: string | number;
  orders_count: number;
  has_used_welcome_offer: boolean;
  created_at: Date;
  deleted_at: Date | null;
};

function mapUser(row: UserRow) {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    phone: row.phone,
    role: row.role,
    referralCode: row.referral_code,
    referralCredits: Number(row.referral_credits),
    ordersCount: row.orders_count,
    hasUsedWelcomeOffer: row.has_used_welcome_offer,
    createdAt: row.created_at,
    deletedAt: row.deleted_at,
  };
}

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
  } catch (e) {
    return authErrorResponse(e);
  }

  const sql = getSql();
  const rows = await sql<UserRow[]>`
    SELECT id, email, name, phone, role, referral_code, referral_credits,
           orders_count, has_used_welcome_offer, created_at, deleted_at
    FROM users
    WHERE role IN ('customer', 'admin')
    ORDER BY created_at DESC
    LIMIT 500
  `;

  return NextResponse.json(
    { ok: true, users: rows.map(mapUser) },
    { headers: { "Cache-Control": "no-store" } },
  );
}
