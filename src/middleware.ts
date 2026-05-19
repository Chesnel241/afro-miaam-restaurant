import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  MAINTENANCE_MODE,
  MAINTENANCE_BYPASS_KEY,
  MAINTENANCE_COOKIE_NAME,
} from "./lib/maintenance";

const STATIC_EXT_RE = /\.(?:png|jpg|jpeg|gif|webp|svg|ico|css|js|map|woff2?|ttf|otf|eot|txt|xml|json|pdf)$/i;
const ONE_HOUR_SECONDS = 60 * 60;

function generateNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function buildCsp(nonce: string): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' https://www.google.com/recaptcha/ https://www.gstatic.com https://apis.google.com`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' data: https://fonts.gstatic.com",
    "img-src 'self' data: blob: https://images.unsplash.com https://firebasestorage.googleapis.com https://lh3.googleusercontent.com",
    "connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://firebase.googleapis.com https://firebaseappcheck.googleapis.com https://firestore.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://www.google.com/recaptcha/ wss://*.firebaseio.com",
    "frame-src https://www.google.com/recaptcha/ https://accounts.google.com https://*.firebaseapp.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    "upgrade-insecure-requests",
  ].join("; ");
}

function withNonce(request: NextRequest, nonce: string) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-csp-nonce", nonce);

  if (process.env.NODE_ENV === "development") {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  requestHeaders.set("content-security-policy", buildCsp(nonce));
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", buildCsp(nonce));
  return response;
}

export function middleware(request: NextRequest) {
  const nonce = generateNonce();
  const { pathname, searchParams } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    STATIC_EXT_RE.test(pathname)
  ) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/maintenance")) {
    return withNonce(request, nonce);
  }

  if (!MAINTENANCE_MODE) {
    return withNonce(request, nonce);
  }

  if (pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  const cookieKey = request.cookies.get(MAINTENANCE_COOKIE_NAME)?.value;
  if (cookieKey && cookieKey === MAINTENANCE_BYPASS_KEY) {
    return withNonce(request, nonce);
  }

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
