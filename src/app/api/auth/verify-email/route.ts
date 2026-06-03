import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";
import { consumeEmailVerificationToken } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit-store";
import { clientIp } from "@/lib/utils";

/**
 * POST /api/auth/verify-email  { token }
 *
 * Consumes a one-time email-verification token (created at signup or via a
 * resend flow) and flips users.email_verified to true. Idempotent in spirit:
 * if the user is already verified we still return ok (the user's intent — to
 * have a verified account — is satisfied).
 *
 * The token itself is single-use: consumeEmailVerificationToken DELETEs the
 * row, so a stolen-after-use token can't re-verify. Expired tokens (>24h)
 * return 400.
 */

const MAX_BODY_BYTES = 16 * 1024;

type Body = { token?: unknown };

function bad(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}

export async function POST(request: Request) {
  if (!(await checkRateLimit(`verify-email:ip:${clientIp(request)}`, 5, 60_000))) {
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

  const token =
    typeof body.token === "string" ? body.token.trim().slice(0, 256) : "";
  if (!token) return bad("Jeton manquant.");

  const consumed = await consumeEmailVerificationToken(token);
  if (!consumed) {
    return bad("Lien de vérification invalide ou expiré.", 400);
  }

  const sql = getSql();
  await sql`
    update users
    set email_verified = true
    where id = ${consumed.userId}
  `;

  return NextResponse.json({ ok: true });
}
