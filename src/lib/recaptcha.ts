/**
 * Google reCAPTCHA server-side verification.
 *
 * Compatible with both reCAPTCHA v3 and reCAPTCHA Enterprise tokens when using
 * the legacy secret key.
 *
 * No external dependencies — uses the global `fetch`.
 */

const VERIFY_URL = "https://www.google.com/recaptcha/api/siteverify";

interface SiteVerifyResponse {
  success: boolean;
  score?: number;
  action?: string;
  challenge_ts?: string;
  hostname?: string;
  "error-codes"?: string[];
}

/**
 * Verify a reCAPTCHA token.
 *
 * @returns true if Google reports success AND score >= minScore.
 *
 * Fail-closed semantics:
 *   - No RECAPTCHA_SECRET_KEY configured:
 *       - production  -> return false (fail-closed) + console.error
 *       - development -> return true  + console.warn (lets local dev proceed)
 *   - Network / parse errors:
 *       - production  -> return false
 *       - development -> return true (don't block local dev on transient errors)
 *   - Missing/empty token -> always false.
 */
export async function verifyRecaptcha(
  token: string | null,
  opts?: { minScore?: number; remoteIp?: string },
): Promise<boolean> {
  const minScore = opts?.minScore ?? 0.5;
  const isProd = process.env.NODE_ENV === "production";

  const secret = process.env.RECAPTCHA_SECRET_KEY;
  if (!secret) {
    if (isProd) {
      console.error(
        "[recaptcha] RECAPTCHA_SECRET_KEY not configured in production — failing closed.",
      );
      return false;
    }
    console.warn(
      "[recaptcha] RECAPTCHA_SECRET_KEY not configured (development) — bypassing verification.",
    );
    return true;
  }

  if (!token || !token.trim()) {
    return false;
  }

  try {
    const params = new URLSearchParams();
    params.set("secret", secret);
    params.set("response", token);
    if (opts?.remoteIp) params.set("remoteip", opts.remoteIp);

    const res = await fetch(VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
      // Avoid hanging request threads on a slow Google response.
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      console.warn(`[recaptcha] siteverify HTTP ${res.status}`);
      return isProd ? false : true;
    }

    const data = (await res.json()) as SiteVerifyResponse;
    if (!data.success) {
      console.warn(`[recaptcha] verification failed:`, data["error-codes"]);
      return false;
    }

    // Enterprise/v3 returns a score; if absent, defaults to passing once success.
    const score = typeof data.score === "number" ? data.score : 1;
    return score >= minScore;
  } catch (e) {
    console.warn(
      "[recaptcha] verification error:",
      e instanceof Error ? e.message : "unknown",
    );
    // Fail-closed in production; permissive in dev for transient errors.
    return isProd ? false : true;
  }
}
