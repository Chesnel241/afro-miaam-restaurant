// Shared maintenance configuration used by middleware + API routes.
// Both values come from env vars so the maintenance mode can be toggled
// without a code redeploy and the bypass key can be rotated.

export const MAINTENANCE_MODE: boolean = process.env.MAINTENANCE_MODE === "true";

// Read-once cached bypass key. Falls back to a non-prod sentinel if the
// env var is missing — this fail-loudly value will never match a real request.
export const MAINTENANCE_BYPASS_KEY: string =
  process.env.MAINTENANCE_BYPASS_KEY ?? "__not_configured__";

export const MAINTENANCE_COOKIE_NAME = "afro_maintenance_bypass";
