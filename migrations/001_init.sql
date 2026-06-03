-- =============================================================================
-- AFRO MIAAM — POSTGRESQL INITIAL SCHEMA (001_init.sql)
-- =============================================================================
-- Target: self-hosted PostgreSQL (Hetzner). Replaces Firebase/Firestore.
--
-- Idempotency contract:
--   * This file is mounted at /docker-entrypoint-initdb.d/ for first-boot init
--     AND must be safe to re-run manually (e.g. `psql ... -f 001_init.sql`).
--   * Every object uses IF NOT EXISTS, functions use CREATE OR REPLACE, and
--     triggers are dropped (DROP TRIGGER IF EXISTS) before being (re)created.
--   * Seed rows use ON CONFLICT DO NOTHING.
--
-- Column-naming contract:
--   Other agents/services depend on these exact snake_case column names. Do not
--   rename without coordinating the data layer.
-- =============================================================================

-- pgcrypto provides gen_random_uuid() for UUID primary keys.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- -----------------------------------------------------------------------------
-- updated_at auto-touch trigger function.
-- Attached below to every table that owns an updated_at column. Bumps the
-- column to now() on every UPDATE so callers never have to set it explicitly.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- USERS
-- =============================================================================
-- legacy_uid holds the original Firestore document id (the Firebase Auth uid)
-- for the one-time migration. Firestore uids are NOT UUIDs, so the canonical
-- id stays a fresh gen_random_uuid() and legacy_uid is used only to resolve
-- cross-collection references during import. It is nullable (new native users
-- have none) and UNIQUE (one Firestore uid maps to exactly one row).
--
-- password_hash is nullable: OAuth-only users and ALL migrated users have none.
-- Migrated users must use the "forgot password" flow (Firebase password hashes
-- cannot be exported). See migrations/README.md.
-- =============================================================================
CREATE TABLE IF NOT EXISTS users (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_uid            TEXT UNIQUE,
  email                 TEXT UNIQUE NOT NULL,                -- stored lowercased
  email_verified        BOOLEAN NOT NULL DEFAULT false,
  password_hash         TEXT,                                -- nullable (OAuth / migrated)
  name                  TEXT NOT NULL,
  phone                 TEXT,
  role                  TEXT NOT NULL DEFAULT 'customer'
                          CHECK (role IN ('customer', 'admin', 'deleted')),
  referral_code         TEXT UNIQUE NOT NULL,
  referral_credits      NUMERIC(10,2) NOT NULL DEFAULT 0
                          CHECK (referral_credits >= 0),
  has_used_welcome_offer BOOLEAN NOT NULL DEFAULT false,
  orders_count          INTEGER NOT NULL DEFAULT 0
                          CHECK (orders_count >= 0),
  is_first_login        BOOLEAN NOT NULL DEFAULT true,
  referred_by           UUID REFERENCES users(id),
  image                 TEXT,
  subscribe_newsletter  BOOLEAN NOT NULL DEFAULT false,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at            TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS users_referred_by_idx ON users (referred_by);

DROP TRIGGER IF EXISTS users_set_updated_at ON users;
CREATE TRIGGER users_set_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- OAUTH_ACCOUNTS — federated identity links (Google, etc.)
-- =============================================================================
CREATE TABLE IF NOT EXISTS oauth_accounts (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider            TEXT NOT NULL,
  provider_account_id TEXT NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provider, provider_account_id)
);

CREATE INDEX IF NOT EXISTS oauth_accounts_user_id_idx ON oauth_accounts (user_id);

-- =============================================================================
-- EMAIL_VERIFICATION_TOKENS
-- =============================================================================
-- Only the hash of the token is stored; the raw token lives only in the link
-- emailed to the user.
-- =============================================================================
CREATE TABLE IF NOT EXISTS email_verification_tokens (
  token_hash  TEXT PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS email_verification_tokens_user_id_idx
  ON email_verification_tokens (user_id);

-- =============================================================================
-- PASSWORD_RESET_TOKENS — same shape as email_verification_tokens.
-- =============================================================================
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  token_hash  TEXT PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS password_reset_tokens_user_id_idx
  ON password_reset_tokens (user_id);

-- =============================================================================
-- SESSIONS — refresh-token-backed sessions (one row per active refresh token).
-- =============================================================================
CREATE TABLE IF NOT EXISTS sessions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  refresh_token_hash  TEXT UNIQUE NOT NULL,
  user_agent          TEXT,
  expires_at          TIMESTAMPTZ NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions (user_id);

-- =============================================================================
-- ORDERS
-- =============================================================================
-- user_id is nullable (guest / legacy orders whose user could not be resolved).
-- items, customer (and optionally discounts, review) are stored as JSONB to
-- preserve the Firestore document shape verbatim.
-- =============================================================================
CREATE TABLE IF NOT EXISTS orders (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference             TEXT UNIQUE NOT NULL,
  user_id               UUID REFERENCES users(id),
  user_name             TEXT,
  user_email            TEXT,
  items                 JSONB NOT NULL,
  subtotal              NUMERIC(10,2) NOT NULL CHECK (subtotal >= 0),
  delivery_fee          NUMERIC(10,2) NOT NULL DEFAULT 0,
  total                 NUMERIC(10,2) NOT NULL CHECK (total >= 0),
  deposit_amount        NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (deposit_amount >= 0),
  discounts             JSONB,
  status                TEXT NOT NULL DEFAULT 'Attente Acompte'
                          CHECK (status IN (
                            'Attente Acompte',
                            'Acompte Reçu',
                            'En attente',
                            'En cours',
                            'Livré'
                          )),
  customer              JSONB NOT NULL,
  referrer_id           UUID REFERENCES users(id),
  referral_reward_paid  BOOLEAN NOT NULL DEFAULT false,
  has_reviewed          BOOLEAN NOT NULL DEFAULT false,
  review                JSONB,
  delivery_token_hash   TEXT,
  delivery_token_exp    BIGINT,
  delivered_at          TIMESTAMPTZ,
  deletion_requested    BOOLEAN NOT NULL DEFAULT false,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Query indexes: customer order history (by uid and by email) + admin board.
CREATE INDEX IF NOT EXISTS orders_user_id_created_at_idx
  ON orders (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS orders_lower_user_email_created_at_idx
  ON orders (lower(user_email), created_at DESC);
CREATE INDEX IF NOT EXISTS orders_status_created_at_idx
  ON orders (status, created_at DESC);

DROP TRIGGER IF EXISTS orders_set_updated_at ON orders;
CREATE TRIGGER orders_set_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- MENU_ITEMS
-- =============================================================================
-- id is TEXT to preserve the original Firestore document ids (referenced
-- elsewhere, e.g. inside order items snapshots).
-- =============================================================================
CREATE TABLE IF NOT EXISTS menu_items (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  description     TEXT,
  price           NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  image           TEXT,
  category        TEXT,
  tags            JSONB,
  available       BOOLEAN NOT NULL DEFAULT true,
  flavors         JSONB,
  preferences     JSONB,
  allergens_list  JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS menu_items_available_idx ON menu_items (available);

DROP TRIGGER IF EXISTS menu_items_set_updated_at ON menu_items;
CREATE TRIGGER menu_items_set_updated_at
  BEFORE UPDATE ON menu_items
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- NEWSLETTER — subscriber list.
-- =============================================================================
CREATE TABLE IF NOT EXISTS newsletter (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT UNIQUE NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  source      TEXT
);

-- =============================================================================
-- PRESTATIONS — contact / catering / event enquiries.
-- =============================================================================
CREATE TABLE IF NOT EXISTS prestations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT NOT NULL,
  name        TEXT NOT NULL,
  phone       TEXT,
  type        TEXT,
  message     TEXT,
  user_id     UUID REFERENCES users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- SETTINGS — key/value singleton config (global flags, promo codes, closures).
-- =============================================================================
CREATE TABLE IF NOT EXISTS settings (
  key         TEXT PRIMARY KEY,
  value       JSONB NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS settings_set_updated_at ON settings;
CREATE TRIGGER settings_set_updated_at
  BEFORE UPDATE ON settings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- RATE_LIMITS — server-side fixed-window counters (replaces /rateLimits).
-- reset_at is a Unix epoch in ms (BIGINT) to match the app's existing usage.
-- =============================================================================
CREATE TABLE IF NOT EXISTS rate_limits (
  key       TEXT PRIMARY KEY,
  hits      INTEGER NOT NULL DEFAULT 0,
  reset_at  BIGINT NOT NULL
);

-- =============================================================================
-- SEED — default settings rows. Idempotent: existing rows are left untouched.
-- =============================================================================
INSERT INTO settings (key, value) VALUES
  ('global',     '{"isReviewRewardActive":true,"isWelcomeOfferActive":true}'::jsonb),
  ('promotions', '{"codes":{}}'::jsonb),
  ('closures',   '{"blockedDates":[]}'::jsonb)
ON CONFLICT (key) DO NOTHING;
