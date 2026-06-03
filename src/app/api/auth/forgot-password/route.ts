import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";
import { createPasswordResetToken } from "@/lib/auth";
import { verifyRecaptcha } from "@/lib/recaptcha";
import { checkRateLimit } from "@/lib/rate-limit-store";
import { clientIp } from "@/lib/utils";
import { sendPasswordReset } from "@/lib/email";

/**
 * POST /api/auth/forgot-password  { email, recaptchaToken? }
 *
 * Always returns 200 ok regardless of whether the email matches a user —
 * this prevents the endpoint from being used as an account-existence oracle.
 * The actual side effect (creating a reset token + sending the email) only
 * runs for real, non-deleted users.
 *
 * Send is fire-and-forget: even if Resend is down we don't reveal that to
 * the caller (would be another oracle).
 */

const MAX_BODY_BYTES = 16 * 1024;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Body = {
  email?: unknown;
  recaptchaToken?: unknown;
};

function bad(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}

export async function POST(request: Request) {
  if (
    !(await checkRateLimit(`forgot:ip:${clientIp(request)}`, 10, 60_000))
  ) {
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
  if (raw.length > MAX_BODY_BYTES) return bad("Requête trop volumineuse.", 413);

  let body: Body;
  try {
    body = JSON.parse(raw) as Body;
  } catch {
    return bad("Format JSON invalide.");
  }

  const email =
    typeof body.email === "string"
      ? body.email.trim().toLowerCase().slice(0, 200)
      : "";
  const recaptchaToken =
    typeof body.recaptchaToken === "string" ? body.recaptchaToken : "";

  // reCAPTCHA — in prod, fail-closed but still respond 200 to avoid oracle.
  if (process.env.NODE_ENV === "production") {
    const ok = await verifyRecaptcha(recaptchaToken, {
      remoteIp: clientIp(request),
    });
    if (!ok) {
      return bad("Vérification anti-robot échouée.", 403);
    }
  }

  // Don't reveal validity of the email format either; just no-op if it's bad.
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ ok: true });
  }

  const sql = getSql();
  const rows = await sql<{ id: string; name: string }[]>`
    select id, name
    from users
    where email = ${email} and deleted_at is null
    limit 1
  `;

  if (rows.length > 0) {
    try {
      const token = await createPasswordResetToken(rows[0].id);
      const siteUrl =
        process.env.NEXT_PUBLIC_SITE_URL ||
        process.env.OAUTH_REDIRECT_BASE_URL ||
        "";
      // Fire-and-forget; never block the response on the email provider.
      void sendPasswordReset(email, rows[0].name, token, siteUrl).catch((err) =>
        console.warn("[forgot-password] email send failed:", err),
      );
    } catch (e) {
      console.warn("[forgot-password] token creation failed:", e);
    }
  }

  return NextResponse.json({ ok: true });
}
