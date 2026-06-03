import { NextResponse } from "next/server";
import { clientIp } from "@/lib/utils";
import { checkRateLimit } from "@/lib/rate-limit-store";
import { requireAuth, AuthError, authErrorResponse } from "@/lib/auth";
import { verifyRecaptcha } from "@/lib/recaptcha";
import { getSql } from "@/lib/db";

function bad(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}

export async function POST(request: Request) {
  // Coarse pre-auth IP guard protecting verifyRecaptcha + DB from floods.
  if (!(await checkRateLimit(`promo:ip:${clientIp(request)}`, 30, 60_000))) {
    return bad("Trop de requêtes. Réessayez dans une minute.", 429);
  }

  let payload: { code?: unknown; recaptchaToken?: unknown };
  try {
    payload = await request.json();
  } catch {
    return bad("Format JSON invalide.");
  }

  // reCAPTCHA: enforced in production; in dev, verify-if-present but never block.
  if (process.env.NODE_ENV === "production") {
    const recaptchaToken =
      typeof payload?.recaptchaToken === "string" ? payload.recaptchaToken : null;
    if (!recaptchaToken) {
      return bad("Non autorisé. reCAPTCHA manquant.", 401);
    }
    const ok = await verifyRecaptcha(recaptchaToken, { remoteIp: clientIp(request) });
    if (!ok) {
      return bad("Non autorisé. reCAPTCHA invalide ou expiré.", 401);
    }
  } else if (typeof payload?.recaptchaToken === "string" && payload.recaptchaToken) {
    try {
      await verifyRecaptcha(payload.recaptchaToken, { remoteIp: clientIp(request) });
    } catch (e) {
      console.warn("RECAPTCHA_VERIFY_FAILED", (e as { code?: string }).code ?? "unknown");
    }
  }

  // Authentication via self-hosted JWT — must be logged in.
  let claims;
  try {
    claims = await requireAuth(request);
  } catch (e) {
    if (e instanceof AuthError) {
      return authErrorResponse(e);
    }
    return bad("Non autorisé. Token invalide ou expiré.", 401);
  }
  const uid = claims.sub;

  // Per-uid rate limit keyed on the verified subject.
  if (!(await checkRateLimit(`promo:uid:${uid}`, 30, 60_000))) {
    return bad("Trop de requêtes. Réessayez dans une minute.", 429);
  }

  const rawCode = payload?.code;
  if (typeof rawCode !== "string") {
    return bad("Code manquant ou invalide.");
  }
  const code = rawCode.trim().toUpperCase();
  if (code.length < 1 || code.length > 40) {
    return bad("Code manquant ou invalide.");
  }

  try {
    const sql = getSql();
    const rows = await sql<
      { value: { codes?: Record<string, { code?: string; isActive?: boolean; discountType?: string; discountValue?: unknown }> } }[]
    >`
      SELECT value FROM settings WHERE key = 'promotions' LIMIT 1
    `;
    if (rows.length === 0) {
      return NextResponse.json({ ok: false, reason: "unknown" });
    }
    const data = rows[0].value || {};
    const codes =
      data.codes && typeof data.codes === "object" ? data.codes : {};
    const codeData = codes[code];

    if (!codeData) {
      return NextResponse.json({ ok: false, reason: "unknown" });
    }
    if (codeData.isActive !== true) {
      return NextResponse.json({ ok: false, reason: "inactive" });
    }

    // Echo ONLY the matched code's relevant fields. Never enumerate other codes.
    return NextResponse.json({
      ok: true,
      code,
      discountType: codeData.discountType,
      discountValue: codeData.discountValue,
    });
  } catch (error) {
    console.error("PROMO_VALIDATE_FAILED", (error as { code?: string }).code ?? "unknown");
    return bad("Erreur interne lors de la vérification du code.", 500);
  }
}
