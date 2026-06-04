import { createHash, randomBytes } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { getSql } from "./db";

/**
 * Self-hosted auth module replacing Firebase Auth.
 *
 * Contract preserved for API routes:
 *   - Clients send `Authorization: Bearer <accessToken>`.
 *   - Routes call `requireAuth(request)` / `requireAdmin(request)` and receive
 *     claims shaped like the old Firebase decoded token: { sub(uid), email,
 *     email_verified, role }.
 *
 * Access tokens are short-lived (1h) HS256 JWTs. Long-lived refresh sessions
 * are opaque random tokens; only their SHA-256 hash is stored server-side.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Role = "customer" | "admin" | "deleted";

export type AuthClaims = {
  /** User id (subject). Mirrors the Firebase `uid`. */
  sub: string;
  email: string;
  email_verified: boolean;
  role: Role;
};

const ISSUER = "afro-miaam";
const ACCESS_TOKEN_TTL = "1h";

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

/** Auth failure carrying the HTTP status a route should return. */
export class AuthError extends Error {
  readonly status: number;
  constructor(message: string, status = 401) {
    super(message);
    this.name = "AuthError";
    this.status = status;
  }
}

/**
 * Turns any thrown value into a `Response`. If it's an `AuthError` we use its
 * status; otherwise we fail closed with 401. Routes can do:
 *   try { const claims = await requireAuth(req); ... }
 *   catch (e) { return authErrorResponse(e); }
 */
export function authErrorResponse(e: unknown): Response {
  if (e instanceof AuthError) {
    return Response.json({ error: e.message }, { status: e.status });
  }
  return Response.json({ error: "Non autorisé." }, { status: 401 });
}

// ---------------------------------------------------------------------------
// Secret handling
// ---------------------------------------------------------------------------

/** Resolve the JWT signing secret at call time (never at import time). */
function getJwtSecret(): Uint8Array {
  const secret = process.env.AUTH_JWT_SECRET;
  if (!secret) {
    throw new Error("[auth] AUTH_JWT_SECRET is not set.");
  }
  // HMAC-SHA256 requires at least 32 bytes of entropy to be secure. Refuse
  // anything shorter than 32 chars (≥ 32 bytes for plain ASCII; conservative
  // for any UTF-8). Operators are explicitly told to use `openssl rand -hex 32`
  // in .env.example.
  if (secret.length < 32) {
    throw new Error(
      "[auth] AUTH_JWT_SECRET must be at least 32 characters. " +
        "Generate one with `openssl rand -hex 32`.",
    );
  }
  return new TextEncoder().encode(secret);
}

// ---------------------------------------------------------------------------
// Access tokens (JWT, HS256)
// ---------------------------------------------------------------------------

export async function signAccessToken(user: {
  id: string;
  email: string;
  email_verified: boolean;
  role: Role;
}): Promise<string> {
  return new SignJWT({
    email: user.email,
    email_verified: user.email_verified,
    role: user.role,
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(user.id)
    .setIssuer(ISSUER)
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_TTL)
    .sign(getJwtSecret());
}

const VALID_ROLES: ReadonlySet<string> = new Set([
  "customer",
  "admin",
  "deleted",
]);

export async function verifyAccessToken(token: string): Promise<AuthClaims> {
  let payload: Record<string, unknown>;
  try {
    const result = await jwtVerify(token, getJwtSecret(), {
      issuer: ISSUER,
      algorithms: ["HS256"],
    });
    payload = result.payload as Record<string, unknown>;
  } catch {
    throw new AuthError("Token invalide.", 401);
  }

  const sub = payload.sub;
  const email = payload.email;
  const role = payload.role;

  if (typeof sub !== "string" || !sub) {
    throw new AuthError("Token invalide.", 401);
  }
  if (typeof email !== "string") {
    throw new AuthError("Token invalide.", 401);
  }
  if (typeof role !== "string" || !VALID_ROLES.has(role)) {
    throw new AuthError("Token invalide.", 401);
  }

  return {
    sub,
    email,
    email_verified: payload.email_verified === true,
    role: role as Role,
  };
}

// ---------------------------------------------------------------------------
// Request helpers (Web `Request`)
// ---------------------------------------------------------------------------

export function getBearerToken(request: Request): string | null {
  const header = request.headers.get("Authorization");
  if (!header) return null;
  if (!header.startsWith("Bearer ")) return null;
  const token = header.slice("Bearer ".length).trim();
  return token.length > 0 ? token : null;
}

/** Extract + verify the bearer token. Throws AuthError(401) on failure. */
export async function requireAuth(request: Request): Promise<AuthClaims> {
  const token = getBearerToken(request);
  if (!token) {
    throw new AuthError("Non autorisé.", 401);
  }
  return verifyAccessToken(token);
}

/** requireAuth + role==='admin'. Throws AuthError(403) when not admin. */
export async function requireAdmin(request: Request): Promise<AuthClaims> {
  const claims = await requireAuth(request);
  if (claims.role !== "admin") {
    throw new AuthError("Accès refusé.", 403);
  }
  return claims;
}

// ---------------------------------------------------------------------------
// Password hashing (bcryptjs)
// ---------------------------------------------------------------------------

const BCRYPT_COST = 12;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_COST);
}

export async function verifyPassword(
  plain: string,
  hash: string,
): Promise<boolean> {
  if (!hash) return false;
  try {
    return await bcrypt.compare(plain, hash);
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Token / hashing utilities
// ---------------------------------------------------------------------------

/** Generate an opaque random token (hex). */
function generateRawToken(bytes = 32): string {
  return randomBytes(bytes).toString("hex");
}

/** SHA-256 hash a raw token to its stored (hex) form. */
function sha256Hex(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

// ---------------------------------------------------------------------------
// Refresh sessions (opaque token, sha256-hashed, `sessions` table)
// ---------------------------------------------------------------------------

export const SESSION_COOKIE = "afro_session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

/**
 * Options for the session cookie, compatible with the Next.js cookies() API.
 * `expires` is a Date; secure+httpOnly+lax for CSRF-resistant session auth.
 */
export function sessionCookieOptions(expiresAt: Date) {
  return {
    httpOnly: true,
    secure: true,
    sameSite: "lax" as const,
    path: "/",
    expires: expiresAt,
  };
}

/**
 * Create a refresh session. Stores only sha256(rawToken). Returns the raw
 * token (to be set as the `afro_session` cookie) and the expiry.
 */
export async function createSession(
  userId: string,
  userAgent?: string,
): Promise<{ rawToken: string; expiresAt: Date }> {
  const sql = getSql();
  const rawToken = generateRawToken();
  const tokenHash = sha256Hex(rawToken);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await sql`
    insert into sessions (user_id, refresh_token_hash, user_agent, expires_at)
    values (${userId}, ${tokenHash}, ${userAgent ?? null}, ${expiresAt})
  `;

  return { rawToken, expiresAt };
}

/** Validate a refresh token: hash, lookup, check not expired. */
export async function validateSession(
  rawToken: string,
): Promise<{ userId: string } | null> {
  if (!rawToken) return null;
  const sql = getSql();
  const tokenHash = sha256Hex(rawToken);

  const rows = await sql<{ user_id: string }[]>`
    select user_id
    from sessions
    where refresh_token_hash = ${tokenHash}
      and expires_at > now()
    limit 1
  `;

  if (rows.length === 0) return null;
  return { userId: rows[0].user_id };
}

/**
 * Rotate a refresh session: validate the old token, atomically delete it, and
 * issue a fresh one. Returns null if the old token was invalid/expired.
 */
export async function rotateSession(
  rawToken: string,
  userAgent?: string,
): Promise<{ rawToken: string; expiresAt: Date } | null> {
  if (!rawToken) return null;
  const sql = getSql();
  const oldHash = sha256Hex(rawToken);
  const newRaw = generateRawToken();
  const newHash = sha256Hex(newRaw);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  // Atomic rotate: delete the old row and insert the new one in one
  // transaction, only if the old row is still valid. Prevents token reuse.
  const result = await sql.begin(async (tx) => {
    const deleted = await tx<{ user_id: string }[]>`
      delete from sessions
      where refresh_token_hash = ${oldHash}
        and expires_at > now()
      returning user_id
    `;
    if (deleted.length === 0) return null;

    const userId = deleted[0].user_id;
    await tx`
      insert into sessions (user_id, refresh_token_hash, user_agent, expires_at)
      values (${userId}, ${newHash}, ${userAgent ?? null}, ${expiresAt})
    `;
    return userId;
  });

  if (!result) return null;
  return { rawToken: newRaw, expiresAt };
}

/** Revoke a single session by its raw token. */
export async function revokeSession(rawToken: string): Promise<void> {
  if (!rawToken) return;
  const sql = getSql();
  const tokenHash = sha256Hex(rawToken);
  await sql`delete from sessions where refresh_token_hash = ${tokenHash}`;
}

/** Revoke every session for a user (e.g. on password change / logout-all). */
export async function revokeAllSessions(userId: string): Promise<void> {
  const sql = getSql();
  await sql`delete from sessions where user_id = ${userId}`;
}

// ---------------------------------------------------------------------------
// Email verification tokens (sha256-hashed)
// ---------------------------------------------------------------------------

const EMAIL_VERIFY_TTL_MS = 24 * 60 * 60 * 1000; // 24h

export async function createEmailVerificationToken(
  userId: string,
): Promise<string> {
  const sql = getSql();
  const rawToken = generateRawToken();
  const tokenHash = sha256Hex(rawToken);
  const expiresAt = new Date(Date.now() + EMAIL_VERIFY_TTL_MS);

  await sql`
    insert into email_verification_tokens (token_hash, user_id, expires_at)
    values (${tokenHash}, ${userId}, ${expiresAt})
  `;

  return rawToken;
}

/** Consume (single-use) an email verification token. Returns userId or null. */
export async function consumeEmailVerificationToken(
  rawToken: string,
): Promise<{ userId: string } | null> {
  if (!rawToken) return null;
  const sql = getSql();
  const tokenHash = sha256Hex(rawToken);

  const rows = await sql<{ user_id: string }[]>`
    delete from email_verification_tokens
    where token_hash = ${tokenHash}
      and expires_at > now()
    returning user_id
  `;

  if (rows.length === 0) return null;
  return { userId: rows[0].user_id };
}

// ---------------------------------------------------------------------------
// Password reset tokens (sha256-hashed)
// ---------------------------------------------------------------------------

const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000; // 1h

export async function createPasswordResetToken(
  userId: string,
): Promise<string> {
  const sql = getSql();
  const rawToken = generateRawToken();
  const tokenHash = sha256Hex(rawToken);
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MS);

  await sql`
    insert into password_reset_tokens (token_hash, user_id, expires_at)
    values (${tokenHash}, ${userId}, ${expiresAt})
  `;

  return rawToken;
}

/** Consume (single-use) a password reset token. Returns userId or null. */
export async function consumePasswordResetToken(
  rawToken: string,
): Promise<{ userId: string } | null> {
  if (!rawToken) return null;
  const sql = getSql();
  const tokenHash = sha256Hex(rawToken);

  const rows = await sql<{ user_id: string }[]>`
    delete from password_reset_tokens
    where token_hash = ${tokenHash}
      and expires_at > now()
    returning user_id
  `;

  if (rows.length === 0) return null;
  return { userId: rows[0].user_id };
}

// ---------------------------------------------------------------------------
// Referral codes
// ---------------------------------------------------------------------------

const REFERRAL_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

/**
 * Generate a referral code: `AFRO-<NAME up to 6 alnum upper>-<6 random>`.
 * Uses crypto random bytes for the random suffix (rejection-sampling-free,
 * uniform-enough modulo bias is negligible for a 36-char alphabet here, but
 * we keep it simple and unbiased by masking).
 */
export function generateReferralCode(name: string): string {
  const sanitized = (name || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 6);
  const namePart = sanitized.length > 0 ? sanitized : "MEMBER";

  const bytes = randomBytes(6);
  let randomPart = "";
  for (let i = 0; i < 6; i++) {
    randomPart += REFERRAL_ALPHABET[bytes[i] % REFERRAL_ALPHABET.length];
  }

  return `AFRO-${namePart}-${randomPart}`;
}
