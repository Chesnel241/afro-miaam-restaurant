import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  MAINTENANCE_MODE,
  MAINTENANCE_BYPASS_KEY,
  MAINTENANCE_COOKIE_NAME,
} from "./lib/maintenance";

// Whitelist of static file extensions. The previous `includes('.')` check
// was too permissive (any path containing a dot bypassed maintenance).
const STATIC_EXT_RE = /\.(?:png|jpg|jpeg|gif|webp|svg|ico|css|js|map|woff2?|ttf|otf|eot|txt|xml|json|pdf)$/i;

// H-5 (pass 5): reduced from 24h to 1h. A 24h cookie on a shared device
// (admin uses bypass once, then someone else uses the same browser within
// 24h) gave silent access to the full site during maintenance. 1h is a
// reasonable session.
const ONE_HOUR_SECONDS = 60 * 60;

export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // Always allow Next internals, the maintenance page itself, and static files.
  // /api/* is NOT auto-allowed here: each API route checks the maintenance
  // flag itself so JSON clients see a real 503, not a redirect to HTML.
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/maintenance") ||
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    STATIC_EXT_RE.test(pathname)
  ) {
    return NextResponse.next();
  }

  if (!MAINTENANCE_MODE) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  // Check bypass via secure cookie first (set after a successful query bypass).
  const cookieKey = request.cookies.get(MAINTENANCE_COOKIE_NAME)?.value;
  if (cookieKey && cookieKey === MAINTENANCE_BYPASS_KEY) {
    return NextResponse.next();
  }

  // One-time query bypass: if the URL carries ?key=<correct>, set a HttpOnly
  // cookie and continue. After this, internal navigation works without the
  // key in the URL — so the key doesn't leak via Referer headers.
  const queryKey = searchParams.get("key");
  if (queryKey && queryKey === MAINTENANCE_BYPASS_KEY) {
    const url = request.nextUrl.clone();
    url.searchParams.delete("key");
    const res = NextResponse.redirect(url);
    res.cookies.set(MAINTENANCE_COOKIE_NAME, MAINTENANCE_BYPASS_KEY, {
      httpOnly: true,
      sameSite: "lax",
      secure: true,
      path: "/",
      maxAge: ONE_HOUR_SECONDS,
    });
    return res;
  }

  return NextResponse.redirect(new URL("/maintenance", request.url));
}

export const config = {
  matcher: "/((?!_next/static|_next/image|favicon.ico).*)",
};
