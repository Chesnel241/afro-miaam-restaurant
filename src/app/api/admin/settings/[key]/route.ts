import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";
import { requireAdmin, authErrorResponse } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit-store";

/**
 * PATCH /api/admin/settings/[key] — admin updates a settings doc.
 * Body: the full value object. key whitelist: 'global' | 'promotions' | 'closures'.
 */

export const dynamic = "force-dynamic";

const MAX_BODY = 50 * 1024;
const ALLOWED_KEYS = new Set(["global", "promotions", "closures"]);
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function validateGlobal(v: unknown): boolean {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.isReviewRewardActive === "boolean" &&
    typeof o.isWelcomeOfferActive === "boolean"
  );
}

function validatePromotions(v: unknown): boolean {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  if (!o.codes || typeof o.codes !== "object") return false;
  for (const [code, entry] of Object.entries(o.codes as Record<string, unknown>)) {
    if (typeof code !== "string" || code.length > 60) return false;
    if (!entry || typeof entry !== "object") return false;
    const e = entry as Record<string, unknown>;
    if (typeof e.code !== "string") return false;
    if (typeof e.isActive !== "boolean") return false;
    if (e.discountType !== "percentage" && e.discountType !== "fixed") return false;
    if (typeof e.discountValue !== "number" || !Number.isFinite(e.discountValue)) return false;
  }
  return true;
}

function isRealIsoDate(s: string): boolean {
  if (!ISO_DATE_RE.test(s)) return false;
  // Reject impossible calendar dates (e.g. 2026-13-45): re-serialize and compare.
  const d = new Date(s + "T00:00:00Z");
  if (Number.isNaN(d.getTime())) return false;
  return d.toISOString().slice(0, 10) === s;
}

function validateClosures(v: unknown): boolean {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  if (!Array.isArray(o.blockedDates)) return false;
  for (const d of o.blockedDates) {
    if (typeof d !== "string" || !isRealIsoDate(d)) return false;
  }
  return true;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ key: string }> },
) {
  try {
    await requireAdmin(request);
    const { key } = await params;
    if (!ALLOWED_KEYS.has(key)) {
      return NextResponse.json({ error: "Clé inconnue." }, { status: 400 });
    }
    const sql = getSql();
    const rows = await sql<{ value: unknown }[]>`
      SELECT value FROM settings WHERE key = ${key}
    `;
    const value = rows.length > 0 ? rows[0].value : null;
    return NextResponse.json(
      { ok: true, value },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return authErrorResponse(e);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ key: string }> },
) {
  try {
    const claims = await requireAdmin(request);
    if (!(await checkRateLimit(`admin:settings:${claims.sub}`, 30, 60_000))) {
      return NextResponse.json({ error: "Trop de requêtes." }, { status: 429 });
    }
    const { key } = await params;
    if (!ALLOWED_KEYS.has(key)) {
      return NextResponse.json({ error: "Clé inconnue." }, { status: 400 });
    }

    const lenHeader = request.headers.get("content-length");
    if (lenHeader && Number(lenHeader) > MAX_BODY) {
      return NextResponse.json({ error: "Requête trop volumineuse." }, { status: 413 });
    }
    const raw = await request.text();
    if (raw.length > MAX_BODY) {
      return NextResponse.json({ error: "Requête trop volumineuse." }, { status: 413 });
    }
    const value = JSON.parse(raw);

    let ok = false;
    if (key === "global") ok = validateGlobal(value);
    else if (key === "promotions") ok = validatePromotions(value);
    else if (key === "closures") ok = validateClosures(value);
    if (!ok) return NextResponse.json({ error: "Données invalides." }, { status: 400 });

    const sql = getSql();
    const rows = await sql<Record<string, unknown>[]>`
      INSERT INTO settings (key, value)
      VALUES (${key}, ${sql.json(value)})
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()
      RETURNING value
    `;

    return NextResponse.json({ ok: true, value: rows[0].value });
  } catch (e) {
    return authErrorResponse(e);
  }
}
