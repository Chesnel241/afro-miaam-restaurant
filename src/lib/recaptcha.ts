/**
 * Google reCAPTCHA Enterprise server-side verification.
 *
 * Uses the REST API: https://recaptchaenterprise.googleapis.com/v1/projects/PROJECT_ID/assessments
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
  // Threshold resolution order: explicit call arg > RECAPTCHA_MIN_SCORE env >
  // 0.5 default. Tunable at runtime (no rebuild) so the operator can loosen it
  // if legitimate customers are being blocked.
  const envScore = Number.parseFloat(process.env.RECAPTCHA_MIN_SCORE ?? "");
  const minScore =
    opts?.minScore ??
    (Number.isFinite(envScore) && envScore >= 0 && envScore <= 1 ? envScore : 0.5);
  const isProd = process.env.NODE_ENV === "production";

  // We strictly need a GCP API Key for new Enterprise projects.
  // It usually starts with "AIzaSy".
  const apiKey = process.env.RECAPTCHA_API_KEY;
  
  if (!apiKey) {
    if (isProd) {
      console.error(
        "[recaptcha] CRITICAL: RECAPTCHA_API_KEY is not configured in production. You must create an API Key in Google Cloud (starting with AIzaSy) and add it to your .env file.",
      );
      return false;
    }
    console.warn(
      "[recaptcha] API Key not configured (development) — bypassing verification.",
    );
    return true;
  }

  if (apiKey.startsWith("6L")) {
    console.error("[recaptcha] WARNING: RECAPTCHA_API_KEY looks like a legacy secret key. It should be a Google Cloud API Key starting with AIzaSy.");
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
      const errorText = await res.text();
      console.error(`[recaptcha] API Error ${res.status}: ${errorText}`);
      // If it's a 400/403, the API Key is likely invalid or missing permissions.
      return isProd ? false : true;
    }

    const data = (await res.json()) as AssessmentResponse;
    if (!data.tokenProperties?.valid) {
      // invalidReason is the single most useful diagnostic. Common values:
      //   MALFORMED       -> the token string is not a real reCAPTCHA token
      //   EXPIRED / DUPE  -> token reused or used too late (re-fetch on submit)
      //   BROWSER_ERROR   -> client failed to produce a token
      //   SITE_MISMATCH   -> the site key used by the browser != the one verified
      //                      (usually the build-time vs runtime NEXT_PUBLIC bug)
      console.warn(
        `[recaptcha] token rejected: invalidReason=${data.tokenProperties?.invalidReason ?? "unknown"}`,
      );
      return false;
    }

    // Enterprise returns a score (0.0 bot .. 1.0 human) under riskAnalysis.
    // If absent (e.g. checkbox keys), default to passing.
    const score = typeof data.riskAnalysis?.score === "number" ? data.riskAnalysis.score : 1;
    if (score < minScore) {
      // Previously this rejected silently — a legitimate customer with a
      // borderline score got blocked with no trace. Log it so the threshold
      // can be tuned against real data (lower RECAPTCHA_MIN_SCORE to be more
      // lenient for an ordering flow where false-positives = lost orders).
      console.warn(
        `[recaptcha] score ${score} below threshold ${minScore} — action blocked`,
      );
      return false;
    }
    return true;
  } catch (e) {
    console.warn(
      "[recaptcha] verification error:",
      e instanceof Error ? e.message : "unknown",
    );
    // Fail-closed in production; permissive in dev for transient errors.
    return isProd ? false : true;
  }
}
