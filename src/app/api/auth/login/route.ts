import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";
import {
  verifyPassword,
  signAccessToken,
  createSession,
  SESSION_COOKIE,
  sessionCookieOptions,
  type Role,
} from "@/lib/auth";
import { verifyRecaptcha } from "@/lib/recaptcha";
import { checkRateLimit } from "@/lib/rate-limit-store";
import { clientIp } from "@/lib/utils";

const MAX_BODY_BYTES = 16 * 1024;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Dummy bcrypt hash (cost 12) used as a constant-time decoy when the email
// doesn't match any row. Running verifyPassword against this prevents a timing
// side-channel that would let an attacker enumerate valid emails by comparing
// response latency. The plaintext "x" never matches anything real.
const DUMMY_HASH =
  "$2a$12$CwTycUXWue0Thq9StjUM0uJ8WzDg.5pVR3Pmne5GjvFM4LSiHQz/q";

type LoginBody = {
  email?: unknown;
  password?: unknown;
  recaptchaToken?: unknown;
};

function bad(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}

export async function POST(request: Request) {
  if (!(await checkRateLimit(`login:ip:${clientIp(request)}`, 10, 60_000))) {
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

  let body: LoginBody;
  try {
    body = JSON.parse(raw) as LoginBody;
  } catch {
    return bad("Format JSON invalide.");
  }

  const email =
    typeof body.email === "string"
      ? body.email.trim().toLowerCase().slice(0, 200)
      : "";
  const password = typeof body.password === "string" ? body.password : "";
  const recaptchaToken =
    typeof body.recaptchaToken === "string" ? body.recaptchaToken : "";

  if (!EMAIL_RE.test(email)) return bad("Identifiants invalides.", 401);
  if (!password) return bad("Identifiants invalides.", 401);

  if (process.env.NODE_ENV === "production") {
    const ok = await verifyRecaptcha(recaptchaToken, {
      remoteIp: clientIp(request),
    });
    if (!ok) return bad("Vérification anti-robot échouée.", 403);
  }

  const sql = getSql();
  const rows = await sql<
    {
      id: string;
      email: string;
      email_verified: boolean;
      password_hash: string | null;
      role: Role;
      name: string;
    }[]
  >`
    select id, email, email_verified, password_hash, role, name
    from users
    where email = ${email} and deleted_at is null
    limit 1
  `;

  const row = rows[0];
  // Always run verifyPassword to keep timing constant whether or not the
  // account exists / has a password. Boolean result is only trusted when
  // row is present AND has a password hash.
  const hash = row?.password_hash ?? DUMMY_HASH;
  const passwordOk = await verifyPassword(password, hash);

  if (!row || !row.password_hash || !passwordOk) {
    return bad("Identifiants invalides.", 401);
  }

  const userAgent = request.headers.get("user-agent") ?? undefined;
  const { rawToken, expiresAt } = await createSession(row.id, userAgent);
  const accessToken = await signAccessToken({
    id: row.id,
    email: row.email,
    email_verified: row.email_verified,
    role: row.role,
  });

  // Fetch referral_code for the user payload.
  const meta = await sql<{ referral_code: string }[]>`
    select referral_code from users where id = ${row.id} limit 1
  `;

  const res = NextResponse.json({
    ok: true,
    accessToken,
    user: {
      id: row.id,
      email: row.email,
      name: row.name,
      role: row.role,
      email_verified: row.email_verified,
      referral_code: meta[0]?.referral_code ?? null,
    },
  });
  res.cookies.set(SESSION_COOKIE, rawToken, sessionCookieOptions(expiresAt));
  return res;
}
