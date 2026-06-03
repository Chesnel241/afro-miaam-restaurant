import postgres, { type TransactionSql } from "postgres";

/**
 * postgres.js singleton.
 *
 * The client is created lazily so that merely *importing* this module during
 * the Next.js production build phase (`next build`) does NOT require a live
 * database connection. Routes call `getSql()` at request time, by which point
 * `DATABASE_URL` is guaranteed to be present at runtime.
 *
 * For multi-instance deployments this single pool-per-process model is fine:
 * postgres.js maintains its own connection pool (max: 10 below). On a
 * single-container Hetzner host one process owns one pool.
 */

// Reuse the client across hot-reloads in dev (Next re-evaluates modules).
const globalForDb = globalThis as unknown as {
  __AFRO_PG__?: ReturnType<typeof postgres>;
};

let _sql: ReturnType<typeof postgres> | null = globalForDb.__AFRO_PG__ ?? null;

/**
 * Returns the shared postgres.js client, creating it on first use.
 * Throws (at call time, never at import time) if DATABASE_URL is missing.
 */
export function getSql(): ReturnType<typeof postgres> {
  if (_sql) return _sql;

  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "[db] DATABASE_URL is not set. Cannot open a database connection.",
    );
  }

  _sql = postgres(url, {
    max: 10,
    idle_timeout: 20, // seconds
    connect_timeout: 10, // seconds
  });

  if (process.env.NODE_ENV !== "production") {
    globalForDb.__AFRO_PG__ = _sql;
  }

  return _sql;
}

/**
 * Convenience helper: run a callback inside a single transaction.
 *
 * Usage:
 *   await withTransaction(async (tx) => {
 *     await tx`insert into ...`;
 *     await tx`update ...`;
 *   });
 *
 * The callback receives the transaction-scoped sql tag. The transaction is
 * committed if the callback resolves and rolled back if it throws.
 */
export function withTransaction<T>(
  fn: (tx: TransactionSql) => Promise<T>,
): Promise<T> {
  const sql = getSql();
  // postgres.js `begin` resolves to whatever the callback returns.
  return sql.begin(fn) as Promise<T>;
}
