import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";

/**
 * GET /api/auth/oauth/google/start
 *
 * Begins the Google OAuth Authorization Code flow:
 *   1. Mints a random CSRF state, stores it in an HttpOnly cookie (10 min).
 *   2. Builds the Google authorize URL and 302-redirects the browser to it.
 *
 * The callback route at /api/auth/oauth/google/callback verifies the cookie
 * matches the `state` query param Google echoes back, then exchanges the
 * `code` for tokens.
 *
 * Required env:
 *   GOOGLE_OAUTH_CLIENT_ID
 *   OAUTH_REDIRECT_BASE_URL (e.g. https://afro-miaam.fr)
 */

const OAUTH_STATE_COOKIE = "afro_oauth_state";
const STATE_TTL_MS = 10 * 60 * 1000; // 10 minutes

export async function GET(_request: Request) {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const baseUrl = process.env.OAUTH_REDIRECT_BASE_URL;

  if (!clientId) {
    console.error("[oauth/google/start] GOOGLE_OAUTH_CLIENT_ID is not set.");
    return NextResponse.json(
      { error: "OAuth non configuré." },
      { status: 500 },
    );
  }
  if (!baseUrl) {
    console.error("[oauth/google/start] OAUTH_REDIRECT_BASE_URL is not set.");
    return NextResponse.json(
      { error: "OAuth non configuré." },
      { status: 500 },
    );
  }

  const state = randomBytes(24).toString("hex");
  const redirectUri = `${baseUrl.replace(/\/$/, "")}/api/auth/oauth/google/callback`;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
    access_type: "online",
    include_granted_scopes: "true",
  });

  const authorizeUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

  const res = NextResponse.redirect(authorizeUrl, 302);
  res.cookies.set(OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    expires: new Date(Date.now() + STATE_TTL_MS),
  });
  return res;
}
