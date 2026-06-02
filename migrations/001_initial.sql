CREATE TABLE IF NOT EXISTS reservations (
  id               BIGSERIAL PRIMARY KEY,
  reference        TEXT          NOT NULL UNIQUE,
  status           TEXT          NOT NULL DEFAULT 'pending'
                                 CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  date             DATE          NOT NULL,
  slot             TEXT          NOT NULL,
  delivery_mode    TEXT          NOT NULL CHECK (delivery_mode IN ('retrait', 'livraison')),
  subtotal         NUMERIC(8,2)  NOT NULL CHECK (subtotal >= 0),
  delivery_fee     NUMERIC(8,2)  NOT NULL DEFAULT 0 CHECK (delivery_fee >= 0),
  total            NUMERIC(8,2)  NOT NULL CHECK (total >= 0),
  items_json       JSONB         NOT NULL,
  customer_name    TEXT          NOT NULL,
  customer_phone   TEXT          NOT NULL,
  customer_email   TEXT,
  customer_address TEXT,
  customer_notes   TEXT,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reservations_date   ON reservations (date);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations (status, date);

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS reservations_updated_at ON reservations;
CREATE TRIGGER reservations_updated_at
  BEFORE UPDATE ON reservations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
