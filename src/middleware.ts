import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export const config = { matcher: ["/api/reservation"] };

const WINDOW_MS = 60_000;
const LIMIT = 10;

// In-memory store — works correctly for a single-container deployment.
const rateMap = new Map<string, { count: number; resetAt: number }>();

export function middleware(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";

  const now = Date.now();
  const entry = rateMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateMap.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return NextResponse.next();
  }

  if (entry.count >= LIMIT) {
    return NextResponse.json(
      { error: "Trop de requêtes. Réessayez dans une minute." },
      { status: 429 },
    );
  }

  entry.count++;
  return NextResponse.next();
}
