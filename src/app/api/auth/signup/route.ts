import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";
import {
  hashPassword,
  signAccessToken,
  createSession,
  createEmailVerificationToken,
  generateReferralCode,
  SESSION_COOKIE,
  sessionCookieOptions,
} from "@/lib/auth";
import { verifyRecaptcha } from "@/lib/recaptcha";
import { checkRateLimit } from "@/lib/rate-limit-store";
import { clientIp } from "@/lib/utils";
import { sendEmailVerification } from "@/lib/email";

const MAX_BODY_BYTES = 16 * 1024;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type SignupBody = {
  email?: unknown;
  password?: unknown;
  name?: unknown;
  phone?: unknown;
  referralCode?: unknown;
  subscribeNewsletter?: unknown;
  recaptchaToken?: unknown;
};

function bad(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}

function cleanString(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    .trim()
    .slice(0, max);
}

export async function POST(request: Request) {
  if (!(await checkRateLimit(`signup:ip:${clientIp(request)}`, 10, 60_000))) {
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

  let body: SignupBody;
  try {
    body = JSON.parse(raw) as SignupBody;
  } catch {
    return bad("Format JSON invalide.");
  }

  const email = cleanString(body.email, 200).toLowerCase();
  const password = typeof body.password === "string" ? body.password : "";
  const name = cleanString(body.name, 80);
  const phone = cleanString(body.phone, 32);
  const referralCode = cleanString(body.referralCode, 40);
  const subscribeNewsletter = body.subscribeNewsletter === true;
  const recaptchaToken =
    typeof body.recaptchaToken === "string" ? body.recaptchaToken : "";

  if (!EMAIL_RE.test(email) || email.length > 200) return bad("Email invalide.");
  if (password.length < 10) {
    return bad("Le mot de passe doit contenir au moins 10 caractères.");
  }
  if (password.length > 200) return bad("Mot de passe trop long.");
  if (name.length < 1) return bad("Nom requis.");

  // reCAPTCHA — skip in non-production (the verify helper already handles
  // missing-secret gracefully, but we short-circuit to avoid the network call).
  if (process.env.NODE_ENV === "production") {
    const ok = await verifyRecaptcha(recaptchaToken, {
      remoteIp: clientIp(request),
    });
    if (!ok) return bad("Vérification anti-robot échouée.", 403);
  }

  const sql = getSql();

  // Pre-check uniqueness before doing the expensive bcrypt hash.
  const existing = await sql<{ id: string }[]>`
    select id from users where email = ${email} limit 1
  `;
  if (existing.length > 0) {
    return bad("Un compte existe déjà avec cet email.", 409);
  }

  // Resolve referral code if provided. We tolerate unknown codes silently
  // (the user shouldn't be blocked from signing up by a typo in a code).
  let referredBy: string | null = null;
  if (referralCode) {
    const ref = await sql<{ id: string }[]>`
      select id from users where referral_code = ${referralCode} limit 1
    `;
    if (ref.length > 0) referredBy = ref[0].id;
  }

  const passwordHash = await hashPassword(password);
  const referralCodeOwn = generateReferralCode(name);

  let userId: string;
  let userEmailVerified: boolean;
  try {
    const inserted = await sql<
      { id: string; email_verified: boolean }[]
    >`
      insert into users (
        email, email_verified, password_hash, name, phone, role,
        referral_code, is_first_login, referred_by, subscribe_newsletter
      ) values (
        ${email}, false, ${passwordHash}, ${name},
        ${phone || null}, 'customer',
        ${referralCodeOwn}, true, ${referredBy}, ${subscribeNewsletter}
      )
      returning id, email_verified
    `;
    userId = inserted[0].id;
    userEmailVerified = inserted[0].email_verified;
  } catch (e) {
    // Race condition: another concurrent signup won the unique-email check.
    const msg = e instanceof Error ? e.message : "";
    if (msg.toLowerCase().includes("unique")) {
      return bad("Un compte existe déjà avec cet email.", 409);
    }
    console.error("[signup] insert failed:", e);
    return bad("Erreur lors de la création du compte.", 500);
  }

  // Email verification — fire-and-forget. We swallow errors so a flaky
  // Resend doesn't break the signup flow; the user can request a new
  // verification email later.
  try {
    const verifyToken = await createEmailVerificationToken(userId);
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.OAUTH_REDIRECT_BASE_URL ||
      "";
    // Don't await; surface failures only to the logs.
    void sendEmailVerification(email, name, verifyToken, siteUrl).catch((err) =>
      console.warn("[signup] verification email failed:", err),
    );
  } catch (e) {
    console.warn("[signup] could not create verification token:", e);
  }

  const userAgent = request.headers.get("user-agent") ?? undefined;
  const { rawToken, expiresAt } = await createSession(userId, userAgent);
  const accessToken = await signAccessToken({
    id: userId,
    email,
    email_verified: userEmailVerified,
    role: "customer",
  });

  const res = NextResponse.json({
    ok: true,
    accessToken,
    requiresVerification: true,
    user: {
      id: userId,
      email,
      name,
      role: "customer",
      email_verified: userEmailVerified,
      referral_code: referralCodeOwn,
    },
  });
  res.cookies.set(SESSION_COOKIE, rawToken, sessionCookieOptions(expiresAt));
  return res;
}
