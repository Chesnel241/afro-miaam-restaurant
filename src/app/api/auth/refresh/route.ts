import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";
import {
  rotateSession,
  signAccessToken,
  SESSION_COOKIE,
  sessionCookieOptions,
  type Role,
} from "@/lib/auth";

/**
 * POST /api/auth/refresh
 *
 * Reads the opaque `afro_session` refresh-token cookie and exchanges it for
 * a fresh access JWT. Also rotates the refresh token: the old token is
 * invalidated and a brand-new one is set as the cookie. This means a stolen
 * refresh token only stays useful until the next refresh.
 *
 * On invalid/expired session: clears the cookie and returns 401 so the client
 * can drop its in-memory access token and redirect to /login.
 */

function readCookie(request: Request, name: string): string {
  const header = request.headers.get("cookie") ?? "";
  const match = header.match(
    new RegExp(`(?:^|;\\s*)${name}=([^;]+)`),
  );
  return match ? decodeURIComponent(match[1]) : "";
}

function clearSessionCookie(res: NextResponse): void {
  res.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    expires: new Date(0),
  });
}

export async function POST(request: Request) {
  const rawToken = readCookie(request, SESSION_COOKIE);
  if (!rawToken) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const userAgent = request.headers.get("user-agent") ?? undefined;
  const rotated = await rotateSession(rawToken, userAgent);
  if (!rotated) {
    const res = NextResponse.json({ error: "Non autorisé." }, { status: 401 });
    clearSessionCookie(res);
    return res;
  }

  const sql = getSql();
  // We don't get the userId back from rotateSession (intentional: it's an
  // opaque token), so look it up by the new token hash via the validator
  // would be wasteful. Instead, validate the freshly-issued token to get the
  // user id, then load the user row.
  //
  // Simpler: query the sessions table for the new token's user_id. But we
  // already have everything we need: re-derive via validateSession would also
  // hit the DB. Just load by joining sessions on the new hash.
  const { createHash } = await import("node:crypto");
  const newHash = createHash("sha256").update(rotated.rawToken).digest("hex");

  const userRows = await sql<
    {
      id: string;
      email: string;
      email_verified: boolean;
      role: Role;
      name: string;
      referral_code: string;
    }[]
  >`
    select u.id, u.email, u.email_verified, u.role, u.name, u.referral_code
    from users u
    join sessions s on s.user_id = u.id
    where s.refresh_token_hash = ${newHash}
      and u.deleted_at is null
    limit 1
  `;

  const user = userRows[0];
  if (!user) {
    // User was deleted between rotate and lookup — clear cookie and 401.
    const res = NextResponse.json({ error: "Non autorisé." }, { status: 401 });
    clearSessionCookie(res);
    return res;
  }

  const accessToken = await signAccessToken({
    id: user.id,
    email: user.email,
    email_verified: user.email_verified,
    role: user.role,
  });

  const res = NextResponse.json({
    ok: true,
    accessToken,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      email_verified: user.email_verified,
      referral_code: user.referral_code,
    },
  });
  res.cookies.set(
    SESSION_COOKIE,
    rotated.rawToken,
    sessionCookieOptions(rotated.expiresAt),
  );
  return res;
}
