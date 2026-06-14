import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";
import { requireAuth, authErrorResponse } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit-store";
import { coerceGlobalSettings, DEFAULT_GLOBAL_SETTINGS } from "@/lib/schedule";

/**
 * GET /api/settings/global — authenticated read of the 'global' settings row.
 *
 * Returns sensible defaults when the row is missing (fresh install / dev) and
 * coerces any partial/corrupted value into the full GlobalSettings shape — so
 * the client always sees `schedule[7]`, `leadTimeMin`, `slotDurationMin` even
 * on a database that pre-dates migration 004.
 */

export const dynamic = "force-dynamic";

const DEFAULT_GLOBAL = DEFAULT_GLOBAL_SETTINGS;

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

  const settings = rows.length > 0 ? coerceGlobalSettings(rows[0].value) : DEFAULT_GLOBAL;

  return NextResponse.json(
    { ok: true, settings },
    { headers: { "Cache-Control": "no-store" } },
  );
}
