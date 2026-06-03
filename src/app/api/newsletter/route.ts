import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit-store";
import { verifyRecaptcha } from "@/lib/recaptcha";
import { clientIp } from "@/lib/utils";

/**
 * POST /api/newsletter — public newsletter sign-up.
 *
 * Idempotent: re-subscribing an existing email is a no-op (does not surface
 * the existing-vs-new state to the caller, to prevent address enumeration).
 */

export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 32 * 1024;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function bad(error: string, status = 400) {
  return NextResponse.json(
    { error },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: Request) {
  if (!(await checkRateLimit(`newsletter:ip:${clientIp(request)}`, 5, 60_000))) {
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

  let payload: { email?: unknown; recaptchaToken?: unknown };
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

  if (typeof payload.email !== "string") return bad("Email invalide.");
  const email = payload.email.trim().toLowerCase().slice(0, 200);
  if (!EMAIL_RE.test(email)) return bad("Email invalide.");

  const sql = getSql();
  await sql`
    INSERT INTO newsletter (email, source)
    VALUES (${email}, ${"site"})
    ON CONFLICT (email) DO NOTHING
  `;

  return NextResponse.json(
    { ok: true },
    { headers: { "Cache-Control": "no-store" } },
  );
}
