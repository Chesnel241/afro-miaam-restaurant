-- =============================================================================
-- Migration 003 — extend the orders.status whitelist
-- =============================================================================
-- The admin order workflow grew two states:
--   'En Livraison'  — order is out for delivery (between 'En cours' and 'Livré')
--   'Rejetée'       — order was rejected/cancelled by the admin (terminal)
--
-- The original CHECK constraint (migration 001) only allowed the first five
-- statuses, so any UPDATE to one of the new ones would fail with a constraint
-- violation (HTTP 500). This migration replaces the constraint with the full
-- seven-state set.
--
-- Idempotent: drops the constraint only if present, re-adds only if absent.
-- =============================================================================

DO $$
BEGIN
  -- Drop whatever status CHECK currently exists (auto-named orders_status_check
  -- for the inline constraint in 001).
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'orders_status_check'
  ) THEN
    ALTER TABLE orders DROP CONSTRAINT orders_status_check;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'orders_status_chk'
  ) THEN
    ALTER TABLE orders
      ADD CONSTRAINT orders_status_chk
      CHECK (status IN (
        'Attente Acompte',
        'Acompte Reçu',
        'En attente',
        'En cours',
        'En Livraison',
        'Livré',
        'Rejetée'
      ));
  END IF;
END$$;
