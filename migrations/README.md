# Afro Miaam — Postgres data layer & Firestore migration

This directory holds the PostgreSQL schema and the one-time Firestore → Postgres
data migration for moving Afro Miaam off Firebase onto the self-hosted Hetzner
stack.

## Files

| File | Purpose |
| --- | --- |
| `migrations/001_init.sql` | Complete, idempotent schema (tables, indexes, triggers, seed settings). |
| `scripts/export-firestore.mjs` | Dumps every Firestore collection to `./migration-data/<collection>.json`. |
| `scripts/import-postgres.mjs` | Loads those JSON files into Postgres with correct column mapping. |

---

## 1. Apply the schema

`001_init.sql` is **idempotent** (every object uses `IF NOT EXISTS`, functions
use `CREATE OR REPLACE`, triggers are dropped before re-creation, seed rows use
`ON CONFLICT DO NOTHING`). It is safe to run on first boot *and* to re-run.

It is mounted at `/docker-entrypoint-initdb.d/001_init.sql`, so a fresh Postgres
container applies it automatically on first start.

To apply / re-apply manually:

```bash
psql "$DATABASE_URL" -f migrations/001_init.sql
```

What it creates:

- Extensions: `pgcrypto` (for `gen_random_uuid()`).
- Tables: `users`, `oauth_accounts`, `email_verification_tokens`,
  `password_reset_tokens`, `sessions`, `orders`, `menu_items`, `newsletter`,
  `prestations`, `settings`, `rate_limits`.
- Indexes for order history (by user id and by lowercased email), the admin
  board (by status), referral lookups, menu availability, and sessions.
- A `set_updated_at()` trigger function attached to `users`, `orders`,
  `menu_items`, and `settings` to auto-touch `updated_at` on every `UPDATE`.
- Seed rows in `settings`: `global`, `promotions`, `closures`.

---

## 2. Export from Firestore

Requires the Firebase service account in `FIREBASE_SERVICE_ACCOUNT` (either plain
JSON or base64-encoded JSON — same parsing as `src/lib/firebase-admin.ts`).

```bash
FIREBASE_SERVICE_ACCOUNT='<json-or-base64>' node scripts/export-firestore.mjs
```

Writes `./migration-data/users.json`, `orders.json`, `menu.json`,
`newsletter.json`, `prestations.json`, `settings.json`. Each file is an array of
`{ id, ...data }` with Firestore `Timestamp`s converted to ISO strings. The
script prints per-collection counts.

> `migration-data/` is intermediate working data — do not commit it.

---

## 3. Import into Postgres

Requires `DATABASE_URL` and the schema from step 1 already applied.

```bash
DATABASE_URL='postgres://user:pass@host:5432/db' node scripts/import-postgres.mjs
```

The import is **idempotent**: every insert uses `ON CONFLICT DO NOTHING` on a
natural/unique key (`users.legacy_uid`, `orders.reference`, `menu_items.id`,
`newsletter.email`, `settings.key`; `prestations` is de-duplicated on
`(email, created_at)` since the source has no natural key). Re-running it skips
rows that already exist and reports only newly-inserted counts.

### Field mapping (camelCase → snake_case)

| Firestore | Postgres |
| --- | --- |
| `referralCode` | `referral_code` |
| `referralCredits` | `referral_credits` |
| `hasUsedWelcomeOffer` | `has_used_welcome_offer` |
| `ordersCount` | `orders_count` |
| `isFirstLogin` | `is_first_login` |
| `referredBy` | `referred_by` (resolved to new UUID) |
| `subscribeNewsletter` | `subscribe_newsletter` |
| `userId` / `referrerId` | `user_id` / `referrer_id` (resolved to new UUID) |
| `userName` / `userEmail` | `user_name` / `user_email` |
| `deliveryFee` / `depositAmount` | `delivery_fee` / `deposit_amount` |
| `referralRewardPaid` | `referral_reward_paid` |
| `hasReviewed` | `has_reviewed` |
| `deliveryTokenHash` / `deliveryTokenExp` | `delivery_token_hash` / `delivery_token_exp` |
| `deliveredAt` / `deletionRequested` | `delivered_at` / `deletion_requested` |
| `allergensList` | `allergens_list` |
| `createdAt` / `updatedAt` / `deletedAt` | `created_at` / `updated_at` / `deleted_at` |

`items`, `customer`, `discounts`, `review`, `tags`, `flavors`, `preferences`,
`allergens_list` are stored as JSONB, preserving the Firestore document shape.

---

## Identity mapping: `legacy_uid` → new UUID

Firestore document ids (Firebase Auth uids) are **not** UUIDs, so `users.id`
stays a fresh `gen_random_uuid()`. The original uid is preserved in the nullable,
unique column **`users.legacy_uid`**.

Import order and resolution:

1. **Users** are inserted first, storing `legacy_uid`. New UUIDs are minted by
   Postgres.
2. The script reads back the full `legacy_uid → id` map (so it also covers rows
   inserted by a previous run).
3. `users.referred_by` is resolved in a second pass (self-reference can point to
   a user imported later).
4. **Orders** (`user_id`, `referrer_id`) and **prestations** (`user_id`) resolve
   their references through that map. If an old uid cannot be resolved, the FK is
   left `NULL` (e.g. guest / orphaned order); for orders, `user_email` still
   preserves ownership-by-email.
5. **menu_items** keep their original Firestore `TEXT` id verbatim.

Native (post-migration) users have `legacy_uid = NULL`.

---

## ⚠️ Password-reset caveat

Firebase **does not export password hashes**, so `password_hash` is set to `NULL`
for every migrated user. After migration, **all existing users must use the
"forgot password" flow** to set a password before they can log in with
email/password. OAuth-only users are unaffected (they never had a password).

---

## Recommended runbook

```bash
# 1. Schema (auto on first container boot, or manually):
psql "$DATABASE_URL" -f migrations/001_init.sql

# 2. Export from Firebase:
FIREBASE_SERVICE_ACCOUNT='<json-or-base64>' node scripts/export-firestore.mjs

# 3. Import into Postgres:
DATABASE_URL="$DATABASE_URL" node scripts/import-postgres.mjs
```

Verify counts after import, e.g.:

```sql
SELECT
  (SELECT count(*) FROM users)       AS users,
  (SELECT count(*) FROM orders)      AS orders,
  (SELECT count(*) FROM menu_items)  AS menu_items;
```
