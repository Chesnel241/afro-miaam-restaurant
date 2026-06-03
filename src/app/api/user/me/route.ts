import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";
import {
  requireAuth,
  authErrorResponse,
  revokeAllSessions,
  type Role,
} from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit-store";

/**
 * PATCH /api/user/me  — update mutable profile fields.
 * DELETE /api/user/me — soft-delete the current user.
 */

export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 32 * 1024;

type UserRow = {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  role: Role;
  email_verified: boolean;
  referral_code: string;
  referral_credits: string | number;
  has_used_welcome_offer: boolean;
  orders_count: number;
  is_first_login: boolean;
  image: string | null;
  subscribe_newsletter: boolean;
};

function mapUser(row: UserRow) {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    phone: row.phone,
    role: row.role,
    emailVerified: row.email_verified,
    referralCode: row.referral_code,
    referralCredits: Number(row.referral_credits),
    hasUsedWelcomeOffer: row.has_used_welcome_offer,
    ordersCount: row.orders_count,
    isFirstLogin: row.is_first_login,
    image: row.image,
    subscribeNewsletter: row.subscribe_newsletter,
  };
}

function bad(error: string, status = 400) {
  return NextResponse.json(
    { error },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

function clean(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    .trim();
  if (trimmed.length === 0) return null;
  return trimmed.slice(0, max);
}

export async function PATCH(request: Request) {
  let claims;
  try {
    claims = await requireAuth(request);
  } catch (e) {
    return authErrorResponse(e);
  }

  if (!(await checkRateLimit(`user-me:uid:${claims.sub}`, 20, 60_000))) {
    return bad("Trop de requêtes. Réessayez dans une minute.", 429);
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

  let payload: {
    name?: unknown;
    phone?: unknown;
    image?: unknown;
    subscribeNewsletter?: unknown;
  };
  try {
    payload = raw ? JSON.parse(raw) : {};
  } catch {
    return bad("Format JSON invalide.");
  }

  // name: 1-80 (if provided as a non-empty string)
  let nextName: string | null = null;
  if (payload.name !== undefined) {
    if (typeof payload.name !== "string") return bad("Nom invalide.");
    const cleaned = clean(payload.name, 80);
    if (!cleaned || cleaned.length < 1) return bad("Nom invalide.");
    nextName = cleaned;
  }

  let nextPhone: string | null | undefined = undefined;
  if (payload.phone !== undefined) {
    if (payload.phone === null) {
      nextPhone = null;
    } else if (typeof payload.phone === "string") {
      // Allow empty string to clear; otherwise enforce ≤32 chars.
      const cleaned = clean(payload.phone, 32);
      nextPhone = cleaned; // null if empty after trim — clears the column
    } else {
      return bad("Téléphone invalide.");
    }
  }

  let nextImage: string | null | undefined = undefined;
  if (payload.image !== undefined) {
    if (payload.image === null) {
      nextImage = null;
    } else if (typeof payload.image === "string") {
      const cleaned = clean(payload.image, 500);
      nextImage = cleaned;
    } else {
      return bad("Image invalide.");
    }
  }

  let nextSubscribe: boolean | null = null;
  if (payload.subscribeNewsletter !== undefined) {
    if (typeof payload.subscribeNewsletter !== "boolean") {
      return bad("Préférence newsletter invalide.");
    }
    nextSubscribe = payload.subscribeNewsletter;
  }

  // For fields where the client may legitimately clear the value (phone,
  // image), COALESCE doesn't work — null collapses to the existing value.
  // Use a "did the client send this key?" flag (set when it did) so the
  // UPDATE applies the new value (including null) only when explicitly
  // provided, and otherwise leaves the column untouched.
  const sql = getSql();
  const phoneSent = nextPhone !== undefined;
  const phoneValue = phoneSent ? (nextPhone === "" ? null : nextPhone ?? null) : null;
  const imageSent = nextImage !== undefined;
  const imageValue = imageSent ? (nextImage === "" ? null : nextImage ?? null) : null;
  const rows = await sql<UserRow[]>`
    UPDATE users
    SET
      name = COALESCE(${nextName}, name),
      phone = CASE WHEN ${phoneSent} THEN ${phoneValue} ELSE phone END,
      image = CASE WHEN ${imageSent} THEN ${imageValue} ELSE image END,
      subscribe_newsletter = COALESCE(${nextSubscribe}, subscribe_newsletter),
      is_first_login = false,
      updated_at = now()
    WHERE id = ${claims.sub} AND deleted_at IS NULL
    RETURNING id, email, name, phone, role, email_verified, referral_code,
              referral_credits, has_used_welcome_offer, orders_count,
              is_first_login, image, subscribe_newsletter
  `;

  if (rows.length === 0) {
    return bad("Utilisateur introuvable.", 404);
  }

  return NextResponse.json(
    { ok: true, user: mapUser(rows[0]) },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function DELETE(request: Request) {
  let claims;
  try {
    claims = await requireAuth(request);
  } catch (e) {
    return authErrorResponse(e);
  }

  if (!(await checkRateLimit(`user-me-del:uid:${claims.sub}`, 5, 60_000))) {
    return bad("Trop de requêtes. Réessayez dans une minute.", 429);
  }

  const sql = getSql();
  // Free the email for re-signup by anonymising it.
  await sql`
    UPDATE users
    SET role = 'deleted',
        deleted_at = now(),
        email = concat('deleted-', id::text, '@deleted.local'),
        updated_at = now()
    WHERE id = ${claims.sub}
  `;

  await revokeAllSessions(claims.sub);

  return NextResponse.json(
    { ok: true },
    { headers: { "Cache-Control": "no-store" } },
  );
}
