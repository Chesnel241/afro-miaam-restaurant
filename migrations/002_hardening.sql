-- =============================================================================
-- Migration 002 — hardening (idempotency on orders + missing CHECK)
-- =============================================================================
-- Additive only. Safe to re-run (IF NOT EXISTS guards + idempotent constraint
-- creation via DO blocks).
--
-- What it adds:
--   1) orders.idempotency_key TEXT NULLABLE
--      Per-user unique partial index. Lets the reservation API safely retry
--      the same submission (e.g. browser back+resubmit, two-tab double-click,
--      network retry) without creating a second order — the second insert
--      hits the unique constraint and the route returns the original order.
--   2) orders.delivery_fee >= 0 CHECK
--      Defense in depth; the route already hardcodes the fee but the schema
--      should refuse a negative on principle.
-- =============================================================================

-- 1) Idempotency key on orders -----------------------------------------------

ALTER TABLE orders ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

-- Per-user unique on the key when present. Partial index so NULL keys (legacy
-- rows + anonymous flows) don't collide.
CREATE UNIQUE INDEX IF NOT EXISTS orders_user_idempotency_key_idx
  ON orders (user_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- 2) delivery_fee >= 0 -------------------------------------------------------
-- Postgres doesn't have "ADD CONSTRAINT IF NOT EXISTS" for CHECK constraints,
-- so use a DO block that introspects pg_constraint.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'orders_delivery_fee_nonneg_chk'
  ) THEN
    ALTER TABLE orders
      ADD CONSTRAINT orders_delivery_fee_nonneg_chk
      CHECK (delivery_fee >= 0);
  END IF;
END$$;
