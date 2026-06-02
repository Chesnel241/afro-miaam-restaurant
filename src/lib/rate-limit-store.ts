/**
 * Firebase-free rate limiter.
 *
 * Preserves the existing signature so route handlers can swap their import
 * (`@/lib/rate-limit` -> `@/lib/rate-limit-store`) with no other changes:
 *
 *   checkRateLimit(key, maxHits, windowMs): Promise<boolean>   // true = ALLOWED
 *
 * Implementation: in-memory fixed-window counter (key -> { hits, resetAt }).
 * This is the right model for the single-container Hetzner deployment, where
 * one process owns all traffic — the counter is authoritative and deterministic
 * (no fail-open behavior that an attacker could induce).
 *
 * MULTI-INSTANCE NOTE: if this app is ever scaled horizontally, this Map is
 * per-process and would let an attacker get N× the limit across N instances.
 * In that case back this with a shared store (Postgres upsert or Redis
 * INCR/EXPIRE) — keep the same signature and swap the body.
 *
 * Dependency-free.
 */

interface Bucket {
  hits: number;
  resetAt: number; // epoch ms when the window resets
}

const store = new Map<string, Bucket>();

// Periodically prune expired buckets so the Map doesn't grow unbounded with
// one-off keys (e.g. per-IP keys). Runs in-process; unref'd so it never keeps
// the event loop (or test runner) alive.
const PRUNE_INTERVAL_MS = 60_000;
let lastPrune = 0;

function prune(now: number): void {
  if (now - lastPrune < PRUNE_INTERVAL_MS) return;
  lastPrune = now;
  for (const [key, bucket] of store) {
    if (bucket.resetAt <= now) {
      store.delete(key);
    }
  }
}

/**
 * Fixed-window rate limiter.
 *
 * @param key      Unique throttle key (e.g. `reservation:${ip}`).
 * @param maxHits  Max requests allowed within the window.
 * @param windowMs Window length in milliseconds.
 * @returns        true if the request is ALLOWED, false if it should be
 *                 throttled (HTTP 429).
 */
export async function checkRateLimit(
  key: string,
  maxHits: number,
  windowMs: number,
): Promise<boolean> {
  const now = Date.now();
  prune(now);

  const bucket = store.get(key);

  if (!bucket || bucket.resetAt <= now) {
    // New window.
    store.set(key, { hits: 1, resetAt: now + windowMs });
    return true;
  }

  if (bucket.hits >= maxHits) {
    return false;
  }

  bucket.hits += 1;
  return true;
}
