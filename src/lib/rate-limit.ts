import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

// L1: in-memory per-instance cache (fast reject on hot lambdas).
const localCache = new Map<string, { hits: number; resetAt: number }>();

/**
 * Sliding fixed-window rate limiter shared across serverless instances via
 * Firestore. Returns true if the request is ALLOWED, false if it should be
 * throttled (HTTP 429).
 *
 * @param key      Unique throttle key (e.g. `reservation:${ip}`).
 * @param maxHits  Max requests allowed within the window.
 * @param windowMs Window length in milliseconds.
 */
export async function checkRateLimit(
  key: string,
  maxHits: number,
  windowMs: number,
): Promise<boolean> {
  const now = Date.now();

  // L1 fast path: if this instance has already seen the window exceeded,
  // reject without touching Firestore.
  const local = localCache.get(key);
  if (local && local.resetAt > now && local.hits >= maxHits) {
    return false;
  }

  // L2: authoritative shared counter in Firestore.
  const ref = adminDb.collection("rateLimits").doc(encodeURIComponent(key));
  try {
    const allowed = await adminDb.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const data = snap.exists ? snap.data() : undefined;
      const resetAt = typeof data?.resetAt === "number" ? data.resetAt : 0;
      const hits = typeof data?.hits === "number" ? data.hits : 0;

      if (!snap.exists || resetAt < now) {
        tx.set(ref, { hits: 1, resetAt: now + windowMs });
        localCache.set(key, { hits: 1, resetAt: now + windowMs });
        return true;
      }
      if (hits >= maxHits) {
        localCache.set(key, { hits, resetAt });
        return false;
      }
      tx.update(ref, { hits: FieldValue.increment(1) });
      localCache.set(key, { hits: hits + 1, resetAt });
      return true;
    });
    return allowed;
  } catch (e) {
    // FAIL CLOSED on Firestore errors (pentest finding H-3). Previously this
    // failed OPEN, which let an attacker disable throttling entirely by
    // inducing Firestore errors (e.g. exhausting quota / triggering contention)
    // and then flooding freely. Denying here loses no legitimately-completable
    // request: every endpoint that calls this limiter also performs a Firestore
    // write moments later (the order/review/referral transaction), so if
    // Firestore is erroring that downstream write would fail anyway. Returning
    // false (HTTP 429) removes the attacker's ability to bypass the limiter.
    console.warn("RATE_LIMIT_FIRESTORE_ERROR", (e as { code?: string }).code ?? "unknown");
    return false;
  }
}
