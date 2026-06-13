/**
 * Google reCAPTCHA v3 server-side verification.
 *
 * Firebase-free replacement for App Check. Client obtains a reCAPTCHA v3 token
 * and sends it with the request; the server verifies it here against Google,
 * checking the action-independent score against `minScore`.
 *
 * No external dependencies — uses the global `fetch`.
 */

const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT || "afro-miaam";
const SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || "6Lf7GessAAAAAGDZVnxZQoq9C4YN8hAUg8pMIZya";

interface AssessmentResponse {
  tokenProperties?: {
    valid?: boolean;
    invalidReason?: string;
  };
  riskAnalysis?: {
    score?: number;
  };
}

/**
 * Verify a reCAPTCHA Enterprise token.
 *
 * @returns true if Google reports success AND score >= minScore.
 *
 * Fail-closed semantics:
 *   - No API KEY configured:
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

  // In Google Cloud, the API key is typically passed. We check RECAPTCHA_API_KEY
  // or fallback to RECAPTCHA_SECRET_KEY to not break existing deployments.
  const apiKey = process.env.RECAPTCHA_API_KEY || process.env.RECAPTCHA_SECRET_KEY;
  if (!apiKey) {
    if (isProd) {
      console.error(
        "[recaptcha] API Key not configured in production — failing closed.",
      );
      return false;
    }
    console.warn(
      "[recaptcha] API Key not configured (development) — bypassing verification.",
    );
    return true;
  }

  if (!token || !token.trim()) {
    return false;
  }

  try {
    const verifyUrl = `https://recaptchaenterprise.googleapis.com/v1/projects/${PROJECT_ID}/assessments?key=${apiKey}`;
    
    const payload: Record<string, any> = {
      event: {
        token: token,
        siteKey: SITE_KEY,
      }
    };
    if (opts?.remoteIp) {
      payload.event.userIpAddress = opts.remoteIp;
    }

    const res = await fetch(verifyUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      // Avoid hanging request threads on a slow Google response.
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      console.warn(`[recaptcha] assessments HTTP ${res.status}`);
      return isProd ? false : true;
    }

    const data = (await res.json()) as AssessmentResponse;
    if (!data.tokenProperties?.valid) {
      console.warn(`[recaptcha] token invalid: ${data.tokenProperties?.invalidReason}`);
      return false;
    }

    // Enterprise returns a score under riskAnalysis; if absent, we default to passing.
    const score = typeof data.riskAnalysis?.score === "number" ? data.riskAnalysis.score : 1;
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
