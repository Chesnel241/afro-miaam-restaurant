import { getSql } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/health — liveness + DB readiness probe.
 *
 * Hit by Docker HEALTHCHECK and external uptime monitors. Returns:
 *   200 { ok: true,  ts, db: "ok" }                — app + DB are reachable
 *   503 { ok: false, ts, db: "down", error: "…" } — DB unreachable
 *
 * A failing healthcheck causes Docker to mark the container unhealthy and
 * restart it (per compose policy), so we WANT to surface DB outages here
 * rather than silently 200 while requests fail downstream.
 */
// Build/version info — surfaced in /api/health so rollout monitors can
// confirm which container is live without ssh'ing in. The CI/CD pipeline
// can wire GIT_SHA at build time via Docker build args; falls back to
// `local` for dev or unconfigured deploys.
const VERSION = process.env.GIT_SHA || process.env.VERCEL_GIT_COMMIT_SHA || "local";

export async function GET() {
  const ts = new Date().toISOString();
  try {
    const sql = getSql();
    // Lightweight ping. 1.5s ceiling so the healthcheck never hangs.
    await Promise.race([
      sql`SELECT 1`,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("db timeout")), 1500),
      ),
    ]);
    return Response.json({ ok: true, ts, db: "ok", version: VERSION });
  } catch (e) {
    return Response.json(
      {
        ok: false,
        ts,
        db: "down",
        error: (e as Error).message ?? "unknown",
        version: VERSION,
      },
      { status: 503 },
    );
  }
}
