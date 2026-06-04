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
    return Response.json({ ok: true, ts, db: "ok" });
  } catch (e) {
    return Response.json(
      { ok: false, ts, db: "down", error: (e as Error).message ?? "unknown" },
      { status: 503 },
    );
  }
}
