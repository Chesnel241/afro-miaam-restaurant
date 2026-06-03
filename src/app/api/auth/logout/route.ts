import { NextResponse } from "next/server";
import { revokeSession, SESSION_COOKIE } from "@/lib/auth";

export async function POST(request: Request) {
  const cookie = request.headers.get("cookie") ?? "";
  // Cheap manual cookie parse — we only need one specific value and importing
  // next/headers' cookies() couples this route to the App Router request
  // context unnecessarily.
  const match = cookie.match(
    new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([^;]+)`),
  );
  const rawToken = match ? decodeURIComponent(match[1]) : "";

  if (rawToken) {
    try {
      await revokeSession(rawToken);
    } catch (e) {
      // Don't fail the logout: even if revocation fails server-side, the
      // client will discard the cookie. Just log for visibility.
      console.warn("[logout] revokeSession failed:", e);
    }
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    expires: new Date(0),
  });
  return res;
}
