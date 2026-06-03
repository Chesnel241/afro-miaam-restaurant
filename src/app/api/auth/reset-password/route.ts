import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";
import {
  consumePasswordResetToken,
  hashPassword,
  revokeAllSessions,
} from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit-store";
import { clientIp } from "@/lib/utils";

/**
 * POST /api/auth/reset-password  { token, password }
 *
 * Consumes a one-time password-reset token, replaces the user's password
 * hash, and revokes every active refresh session for that user. Forcing
 * a re-login after a password change is critical: it logs out any attacker
 * who might still hold a stolen refresh token from before the reset.
 */

const MAX_BODY_BYTES = 16 * 1024;

type Body = {
  token?: unknown;
  password?: unknown;
};

function bad(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}

export async function POST(request: Request) {
  if (!(await checkRateLimit(`reset:ip:${clientIp(request)}`, 5, 60_000))) {
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
  const password = typeof body.password === "string" ? body.password : "";

  if (!token) return bad("Jeton manquant.");
  if (password.length < 10) {
    return bad("Le mot de passe doit contenir au moins 10 caractères.");
  }
  if (password.length > 200) return bad("Mot de passe trop long.");

  const consumed = await consumePasswordResetToken(token);
  if (!consumed) {
    return bad("Lien de réinitialisation invalide ou expiré.", 400);
  }

  const passwordHash = await hashPassword(password);
  const sql = getSql();
  await sql`
    update users
    set password_hash = ${passwordHash}
    where id = ${consumed.userId}
  `;

  // Invalidate every existing refresh session for this user. The client that
  // submitted the reset will have to log in fresh with the new password.
  try {
    await revokeAllSessions(consumed.userId);
  } catch (e) {
    console.warn("[reset-password] revokeAllSessions failed:", e);
  }

  return NextResponse.json({ ok: true });
}
