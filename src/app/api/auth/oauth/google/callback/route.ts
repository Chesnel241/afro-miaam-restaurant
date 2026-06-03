import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";
import { withTransaction } from "@/lib/db";
import {
  createSession,
  signAccessToken,
  generateReferralCode,
  SESSION_COOKIE,
  sessionCookieOptions,
  type Role,
} from "@/lib/auth";

/**
 * GET /api/auth/oauth/google/callback?code=...&state=...
 *
 * Completes the OAuth flow:
 *   1. Verifies the `state` query param matches the HttpOnly state cookie set
 *      by /start (CSRF protection).
 *   2. Exchanges the authorization `code` for an access_token + id_token at
 *      Google's token endpoint.
 *   3. Calls Google's userinfo endpoint to get { sub, email, name, picture }.
 *   4. In a transaction: looks up an existing oauth_accounts link; if none,
 *      links to an existing email-matched user; if none, creates a new user.
 *   5. Creates a refresh session, sets the `afro_session` cookie, and 302s
 *      to /mon-compte. The client picks up the session by calling
 *      /api/auth/refresh on mount.
 *
 * Required env:
 *   GOOGLE_OAUTH_CLIENT_ID
 *   GOOGLE_OAUTH_CLIENT_SECRET
 *   OAUTH_REDIRECT_BASE_URL
 */

const OAUTH_STATE_COOKIE = "afro_oauth_state";
const POST_LOGIN_PATH = "/mon-compte";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo";

function readCookie(request: Request, name: string): string {
  const header = request.headers.get("cookie") ?? "";
  const match = header.match(
    new RegExp(`(?:^|;\\s*)${name}=([^;]+)`),
  );
  return match ? decodeURIComponent(match[1]) : "";
}

function clearStateCookie(res: NextResponse): void {
  res.cookies.set(OAUTH_STATE_COOKIE, "", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    expires: new Date(0),
  });
}

function failureRedirect(baseUrl: string, reason: string): NextResponse {
  const target = `${baseUrl.replace(/\/$/, "")}/login?error=${encodeURIComponent(reason)}`;
  const res = NextResponse.redirect(target, 302);
  clearStateCookie(res);
  return res;
}

interface GoogleTokenResponse {
  access_token?: string;
  id_token?: string;
  expires_in?: number;
  token_type?: string;
  scope?: string;
  error?: string;
}

interface GoogleUserInfo {
  sub?: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
}

export async function GET(request: Request) {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const baseUrl = process.env.OAUTH_REDIRECT_BASE_URL;

  if (!clientId || !clientSecret || !baseUrl) {
    console.error("[oauth/google/callback] missing env (CLIENT_ID/SECRET/BASE_URL)");
    return NextResponse.json(
      { error: "OAuth non configuré." },
      { status: 500 },
    );
  }

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const errorParam = url.searchParams.get("error");

  if (errorParam) {
    return failureRedirect(baseUrl, errorParam);
  }
  if (!code || !state) {
    return failureRedirect(baseUrl, "missing_params");
  }

  const cookieState = readCookie(request, OAUTH_STATE_COOKIE);
  if (!cookieState || cookieState !== state) {
    return failureRedirect(baseUrl, "state_mismatch");
  }

  const redirectUri = `${baseUrl.replace(/\/$/, "")}/api/auth/oauth/google/callback`;

  // 1) Exchange code for tokens.
  let tokenData: GoogleTokenResponse;
  try {
    const tokenRes = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }).toString(),
      signal: AbortSignal.timeout(8000),
    });
    if (!tokenRes.ok) {
      const text = await tokenRes.text().catch(() => "");
      console.warn(
        `[oauth/google/callback] token exchange HTTP ${tokenRes.status}: ${text.slice(0, 200)}`,
      );
      return failureRedirect(baseUrl, "token_exchange_failed");
    }
    tokenData = (await tokenRes.json()) as GoogleTokenResponse;
  } catch (e) {
    console.warn(
      "[oauth/google/callback] token exchange failed:",
      e instanceof Error ? e.message : "unknown",
    );
    return failureRedirect(baseUrl, "token_exchange_failed");
  }

  if (!tokenData.access_token) {
    return failureRedirect(baseUrl, "no_access_token");
  }

  // 2) Fetch userinfo.
  let info: GoogleUserInfo;
  try {
    const infoRes = await fetch(USERINFO_URL, {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
      signal: AbortSignal.timeout(5000),
    });
    if (!infoRes.ok) {
      const text = await infoRes.text().catch(() => "");
      console.warn(
        `[oauth/google/callback] userinfo HTTP ${infoRes.status}: ${text.slice(0, 200)}`,
      );
      return failureRedirect(baseUrl, "userinfo_failed");
    }
    info = (await infoRes.json()) as GoogleUserInfo;
  } catch (e) {
    console.warn(
      "[oauth/google/callback] userinfo failed:",
      e instanceof Error ? e.message : "unknown",
    );
    return failureRedirect(baseUrl, "userinfo_failed");
  }

  const providerAccountId = info.sub;
  const email = (info.email ?? "").trim().toLowerCase();
  const emailVerified = info.email_verified === true;
  const name = (info.name ?? "").trim().slice(0, 80) || email.split("@")[0] || "Utilisateur";
  const picture = (info.picture ?? "").trim().slice(0, 500) || null;

  if (!providerAccountId || !email) {
    return failureRedirect(baseUrl, "missing_profile");
  }

  // 3) Resolve / create the user atomically.
  type UserRow = {
    id: string;
    email: string;
    email_verified: boolean;
    role: Role;
    name: string;
    referral_code: string;
  };

  let user: UserRow;
  try {
    user = await withTransaction(async (tx) => {
      // a) Existing oauth link?
      const linked = await tx<UserRow[]>`
        select u.id, u.email, u.email_verified, u.role, u.name, u.referral_code
        from oauth_accounts oa
        join users u on u.id = oa.user_id
        where oa.provider = 'google'
          and oa.provider_account_id = ${providerAccountId}
          and u.deleted_at is null
        limit 1
      `;
      if (linked.length > 0) return linked[0];

      // b) Existing user with this email — link.
      const byEmail = await tx<UserRow[]>`
        select id, email, email_verified, role, name, referral_code
        from users
        where email = ${email} and deleted_at is null
        limit 1
      `;
      if (byEmail.length > 0) {
        const existing = byEmail[0];
        await tx`
          insert into oauth_accounts (user_id, provider, provider_account_id)
          values (${existing.id}, 'google', ${providerAccountId})
          on conflict (provider, provider_account_id) do nothing
        `;
        return existing;
      }

      // c) Brand-new user — insert + link.
      const referralCode = generateReferralCode(name);
      const inserted = await tx<UserRow[]>`
        insert into users (
          email, email_verified, password_hash, name, role,
          referral_code, is_first_login, image
        ) values (
          ${email}, ${emailVerified}, null, ${name}, 'customer',
          ${referralCode}, true, ${picture}
        )
        returning id, email, email_verified, role, name, referral_code
      `;
      const created = inserted[0];

      await tx`
        insert into oauth_accounts (user_id, provider, provider_account_id)
        values (${created.id}, 'google', ${providerAccountId})
      `;
      return created;
    });
  } catch (e) {
    console.error("[oauth/google/callback] user upsert failed:", e);
    return failureRedirect(baseUrl, "user_upsert_failed");
  }

  // If Google reports the email as freshly verified and our row isn't, sync.
  // (Best-effort, outside the transaction.)
  if (emailVerified && !user.email_verified) {
    try {
      const sql = getSql();
      await sql`
        update users set email_verified = true
        where id = ${user.id} and email_verified = false
      `;
      user.email_verified = true;
    } catch (e) {
      console.warn("[oauth/google/callback] email_verified sync failed:", e);
    }
  }

  // 4) Create session + sign access token (access token is currently unused on
  // the redirect leg — the client will hit /api/auth/refresh on mount to
  // exchange the cookie for a fresh one — but we sign it to surface signing
  // failures early instead of on the next request).
  const userAgent = request.headers.get("user-agent") ?? undefined;
  const { rawToken, expiresAt } = await createSession(user.id, userAgent);
  await signAccessToken({
    id: user.id,
    email: user.email,
    email_verified: user.email_verified,
    role: user.role,
  });

  const target = `${baseUrl.replace(/\/$/, "")}${POST_LOGIN_PATH}`;
  const res = NextResponse.redirect(target, 302);
  res.cookies.set(SESSION_COOKIE, rawToken, sessionCookieOptions(expiresAt));
  clearStateCookie(res);
  return res;
}
