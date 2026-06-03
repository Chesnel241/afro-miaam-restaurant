import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";
import { requireAuth, authErrorResponse, type Role } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit-store";
import { clientIp } from "@/lib/utils";

/**
 * GET /api/auth/me
 *
 * Returns the authenticated user's profile (masked — no password hash, no
 * legacy_uid, no admin-only fields). Used by the client after sign-in to
 * hydrate the user state.
 *
 * Returns 401 if the access token is missing/invalid or if the user was
 * soft-deleted server-side after the token was issued.
 */
export async function GET(request: Request) {
  if (!(await checkRateLimit(`me:ip:${clientIp(request)}`, 60, 60_000))) {
    return NextResponse.json(
      { error: "Trop de requêtes. Réessayez dans une minute." },
      { status: 429 },
    );
  }

  let claims;
  try {
    claims = await requireAuth(request);
  } catch (e) {
    return authErrorResponse(e);
  }

  const sql = getSql();
  const rows = await sql<
    {
      id: string;
      email: string;
      name: string;
      role: Role;
      email_verified: boolean;
      referral_code: string;
      referral_credits: string | number;
      has_used_welcome_offer: boolean;
      orders_count: number;
      is_first_login: boolean;
      phone: string | null;
      image: string | null;
      subscribe_newsletter: boolean;
    }[]
  >`
    select
      id, email, name, role, email_verified, referral_code,
      referral_credits, has_used_welcome_offer, orders_count,
      is_first_login, phone, image, subscribe_newsletter
    from users
    where id = ${claims.sub} and deleted_at is null
    limit 1
  `;

  const user = rows[0];
  if (!user) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  return NextResponse.json({
    ok: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      email_verified: user.email_verified,
      referral_code: user.referral_code,
      referral_credits: Number(user.referral_credits),
      has_used_welcome_offer: user.has_used_welcome_offer,
      orders_count: user.orders_count,
      is_first_login: user.is_first_login,
      phone: user.phone,
      image: user.image,
      subscribe_newsletter: user.subscribe_newsletter,
    },
  });
}
