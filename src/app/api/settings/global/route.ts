import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";
import { requireAuth, authErrorResponse } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit-store";

/**
 * GET /api/settings/global — authenticated read of the 'global' settings row.
 *
 * Returns sensible defaults when the row is missing (fresh install / dev).
 */

export const dynamic = "force-dynamic";

const DEFAULT_GLOBAL = {
  isReviewRewardActive: true,
  isWelcomeOfferActive: true,
};

export async function GET(request: Request) {
  let claims;
  try {
    claims = await requireAuth(request);
  } catch (e) {
    return authErrorResponse(e);
  }

  if (!(await checkRateLimit(`settings-global:uid:${claims.sub}`, 60, 60_000))) {
    return NextResponse.json(
      { error: "Trop de requêtes. Réessayez dans une minute." },
      { status: 429, headers: { "Cache-Control": "no-store" } },
    );
  }

  const sql = getSql();
  const rows = await sql<{ value: unknown }[]>`
    SELECT value FROM settings WHERE key = 'global' LIMIT 1
  `;

  const settings =
    rows.length > 0 && rows[0].value && typeof rows[0].value === "object"
      ? rows[0].value
      : DEFAULT_GLOBAL;

  return NextResponse.json(
    { ok: true, settings },
    { headers: { "Cache-Control": "no-store" } },
  );
}
