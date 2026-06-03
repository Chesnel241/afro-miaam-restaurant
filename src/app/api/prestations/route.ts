import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit-store";
import { verifyRecaptcha } from "@/lib/recaptcha";
import { requireAuth } from "@/lib/auth";
import { clientIp } from "@/lib/utils";

/**
 * POST /api/prestations — public contact / catering / event enquiry sink.
 *
 * If the request carries a valid Bearer access token, the resulting row is
 * linked to that user (claims.sub). Authentication failures are swallowed
 * silently — anonymous submissions are allowed.
 */

export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 32 * 1024;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ALLOWED_TYPES = new Set(["contact", "prestation", "event", "catering"]);

function bad(error: string, status = 400) {
  return NextResponse.json(
    { error },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

function clean(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    .trim()
    .slice(0, max);
}

export async function POST(request: Request) {
  if (!(await checkRateLimit(`prestations:ip:${clientIp(request)}`, 3, 60_000))) {
    return bad("Trop de requêtes. Réessayez dans une minute.", 429);
  }

  const lenHeader = request.headers.get("content-length");
  if (lenHeader && Number(lenHeader) > MAX_BODY_BYTES) {
    return bad("Requête trop volumineuse.", 413);
  }

  let raw: string;
  try {
    raw = await request.text();
  } catch {
    return bad("Lecture impossible.");
  }
  if (raw.length > MAX_BODY_BYTES) {
    return bad("Requête trop volumineuse.", 413);
  }

  let payload: {
    email?: unknown;
    name?: unknown;
    phone?: unknown;
    type?: unknown;
    message?: unknown;
    recaptchaToken?: unknown;
  };
  try {
    payload = JSON.parse(raw);
  } catch {
    return bad("Format JSON invalide.");
  }

  if (process.env.NODE_ENV === "production") {
    const token =
      typeof payload.recaptchaToken === "string" ? payload.recaptchaToken : null;
    const ok = await verifyRecaptcha(token, { remoteIp: clientIp(request) });
    if (!ok) return bad("Vérification reCAPTCHA échouée.", 401);
  }

  const email = clean(payload.email, 200).toLowerCase();
  if (!email || !EMAIL_RE.test(email)) return bad("Email invalide.");

  const name = clean(payload.name, 100);
  if (name.length < 1) return bad("Nom invalide.");

  const phone = clean(payload.phone, 32) || null;
  const message = clean(payload.message, 2000) || null;
  const rawType = clean(payload.type, 32);
  const type = ALLOWED_TYPES.has(rawType) ? rawType : "contact";

  // Optional auth: associate with caller if a valid Bearer token is present.
  let userId: string | null = null;
  if (request.headers.get("Authorization")) {
    try {
      const claims = await requireAuth(request);
      userId = claims.sub;
    } catch {
      // Ignore — anonymous submission allowed.
    }
  }

  const sql = getSql();
  await sql`
    INSERT INTO prestations (email, name, phone, type, message, user_id)
    VALUES (${email}, ${name}, ${phone}, ${type}, ${message}, ${userId})
  `;

  return NextResponse.json(
    { ok: true },
    { headers: { "Cache-Control": "no-store" } },
  );
}
