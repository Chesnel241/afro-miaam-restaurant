// Shared maintenance configuration used by middleware + API routes.
// Both values come from env vars so the maintenance mode can be toggled
// without a code redeploy and the bypass key can be rotated.

export const MAINTENANCE_MODE: boolean = process.env.MAINTENANCE_MODE === "true";

// Sentinel used when MAINTENANCE_BYPASS_KEY is missing AND we're not in
// production: dev environments don't need a bypass key (maintenance mode is
// typically off there). The string is intentionally long enough to satisfy
// any future length check below and impossible to type by accident.
const SENTINEL = "__not_configured__sentinel__do_not_use__";

function resolveBypassKey(): string {
  const raw = process.env.MAINTENANCE_BYPASS_KEY ?? "";
  // In production, a weak/missing key would be brute-forceable in seconds and
  // hand an attacker an authenticated bypass of every customer-facing route.
  // Enforce a minimum length (matches AUTH_JWT_SECRET's 32-char gate) and
  // fail loud at boot rather than silently accepting `__not_configured__`.
  if (process.env.NODE_ENV === "production") {
    if (!raw) {
      // We can't throw at module-evaluation time because Next.js evaluates
      // this on the server during build; missing env at build is normal.
      // Falling back to the unguessable sentinel is the safe default: every
      // bypass attempt will fail until the operator sets a real key.
      return SENTINEL;
    }
    if (raw.length < 32) {
      console.error(
        "[maintenance] MAINTENANCE_BYPASS_KEY shorter than 32 chars in production — refusing to honor it. Rotate it with `openssl rand -hex 32`.",
      );
      return SENTINEL;
    }
  }
  return raw || SENTINEL;
}

export const MAINTENANCE_BYPASS_KEY: string = resolveBypassKey();

export const MAINTENANCE_COOKIE_NAME = "afro_maintenance_bypass";
