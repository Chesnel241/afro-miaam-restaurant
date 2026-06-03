#!/usr/bin/env node
// =============================================================================
// import-postgres.mjs — one-time JSON → PostgreSQL import.
// =============================================================================
// Reads ./migration-data/*.json (produced by scripts/export-firestore.mjs) and
// inserts the rows into the Postgres schema created by migrations/001_init.sql.
//
// Usage:
//   DATABASE_URL='postgres://user:pass@host:5432/db' node scripts/import-postgres.mjs
//
// Identity mapping (IMPORTANT):
//   Firestore document ids (Firebase Auth uids) are NOT UUIDs. We therefore let
//   Postgres mint fresh UUID primary keys for users, while preserving the old
//   uid in users.legacy_uid (TEXT UNIQUE). During import we:
//     1. insert users first (storing legacy_uid), then read back the
//        legacy_uid -> new uuid map (covering both freshly-inserted rows AND
//        rows that already existed from a previous run);
//     2. resolve every cross-collection reference (orders.userId / referrerId,
//        users.referredBy, prestations.userId) through that map.
//   menu_items keep their original TEXT id verbatim.
//
// Passwords:
//   Firebase password hashes cannot be exported, so password_hash is left NULL
//   for every migrated user. They must use the "forgot password" flow after
//   migration. See migrations/README.md.
//
// Idempotency:
//   Every insert uses ON CONFLICT DO NOTHING on a natural/unique key, so the
//   script can be re-run safely. Rows already present are skipped, not updated.
// =============================================================================

import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "..", "migration-data");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Load ./migration-data/<name>.json -> array (returns [] if file is absent). */
async function loadCollection(name) {
  const file = join(DATA_DIR, `${name}.json`);
  if (!existsSync(file)) {
    console.warn(`  (skip) ${name}.json not found — skipping ${name}.`);
    return [];
  }
  const raw = await readFile(file, "utf-8");
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new Error(`${name}.json is not a JSON array.`);
  }
  return parsed;
}

/** Lower-case + trim an email, or null if missing/blank. */
function normEmail(v) {
  if (typeof v !== "string") return null;
  const t = v.trim().toLowerCase();
  return t.length ? t : null;
}

/** Coerce to a finite number, or fall back (default 0). */
function num(v, fallback = 0) {
  const n = typeof v === "string" ? Number(v) : v;
  return Number.isFinite(n) ? n : fallback;
}

/** Coerce to boolean with a default. */
function bool(v, fallback = false) {
  return typeof v === "boolean" ? v : fallback;
}

/** Pass a value straight to a JSONB column (null stays null). */
function jsonb(sql, v) {
  if (v === undefined || v === null) return null;
  return sql.json(v);
}

/** Trim a string, or null. */
function str(v) {
  if (typeof v !== "string") return v ?? null;
  const t = v.trim();
  return t.length ? t : null;
}

/** Parse an ISO date string -> Date for a TIMESTAMPTZ column, or null. */
function ts(v) {
  if (!v) return null;
  if (v instanceof Date) return v;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

// Counters for the final report.
const stats = {};
function bump(table, inserted) {
  stats[table] = (stats[table] || 0) + (inserted ? 1 : 0);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const url = process.env.DATABASE_URL;
  if (!url || !url.trim()) {
    console.error("ERROR: DATABASE_URL is not set.");
    process.exit(1);
  }

  const sql = postgres(url, { onnotice: () => {} });

  try {
    console.log(`Importing ${DATA_DIR} -> Postgres\n`);

    // ----- load all collections up front -----
    const [users, orders, menu, newsletter, prestations, settings] = await Promise.all([
      loadCollection("users"),
      loadCollection("orders"),
      loadCollection("menu"),
      loadCollection("newsletter"),
      loadCollection("prestations"),
      loadCollection("settings"),
    ]);

    // =====================================================================
    // 1) USERS — insert first so the legacy_uid -> uuid map can be built.
    //    We DEFER referred_by (self-FK) to a second pass to avoid ordering
    //    problems (a user may be referred by someone imported later).
    // =====================================================================
    for (const u of users) {
      const legacyUid = str(u.id);
      const email = normEmail(u.email);
      if (!email) {
        console.warn(`  (skip) user ${legacyUid}: missing email.`);
        continue;
      }
      // role: Firestore only has customer|admin; clamp anything else.
      const role = u.role === "admin" ? "admin" : "customer";

      const inserted = await sql`
        INSERT INTO users (
          legacy_uid, email, name, phone, role,
          referral_code, referral_credits, has_used_welcome_offer,
          orders_count, is_first_login, image, subscribe_newsletter,
          created_at, updated_at, deleted_at
        ) VALUES (
          ${legacyUid},
          ${email},
          ${str(u.name) ?? email},
          ${str(u.phone)},
          ${role},
          ${str(u.referralCode) ?? legacyUid ?? email},
          ${num(u.referralCredits, 0)},
          ${bool(u.hasUsedWelcomeOffer)},
          ${Math.max(0, Math.trunc(num(u.ordersCount, 0)))},
          ${bool(u.isFirstLogin, true)},
          ${str(u.image)},
          ${bool(u.subscribeNewsletter)},
          ${ts(u.createdAt) ?? sql`now()`},
          ${ts(u.updatedAt) ?? sql`now()`},
          ${ts(u.deletedAt)}
        )
        ON CONFLICT (legacy_uid) DO NOTHING
        RETURNING id
      `;
      bump("users", inserted.length > 0);
    }

    // Build legacy_uid -> new uuid map (covers rows from any prior run too).
    const userMap = new Map();
    {
      const rows = await sql`
        SELECT id, legacy_uid FROM users WHERE legacy_uid IS NOT NULL
      `;
      for (const r of rows) userMap.set(r.legacy_uid, r.id);
    }
    const resolveUser = (uid) => {
      const key = str(uid);
      return key && userMap.has(key) ? userMap.get(key) : null;
    };

    // ----- second pass: resolve users.referred_by self-references -----
    for (const u of users) {
      const refBy = resolveUser(u.referredBy);
      const self = resolveUser(u.id);
      if (refBy && self) {
        await sql`
          UPDATE users
             SET referred_by = ${refBy}
           WHERE id = ${self} AND referred_by IS DISTINCT FROM ${refBy}
        `;
      }
    }

    // =====================================================================
    // 2) MENU_ITEMS — preserve the original TEXT id.
    // =====================================================================
    for (const m of menu) {
      const id = str(m.id);
      if (!id) continue;
      const inserted = await sql`
        INSERT INTO menu_items (
          id, name, description, price, image, category,
          tags, available, flavors, preferences, allergens_list,
          created_at, updated_at, deleted_at
        ) VALUES (
          ${id},
          ${str(m.name) ?? id},
          ${str(m.description)},
          ${num(m.price, 0)},
          ${str(m.image)},
          ${str(m.category)},
          ${jsonb(sql, m.tags)},
          ${bool(m.available, true)},
          ${jsonb(sql, m.flavors)},
          ${jsonb(sql, m.preferences)},
          ${jsonb(sql, m.allergensList)},
          ${ts(m.createdAt) ?? sql`now()`},
          ${ts(m.updatedAt) ?? sql`now()`},
          ${ts(m.deletedAt)}
        )
        ON CONFLICT (id) DO NOTHING
        RETURNING id
      `;
      bump("menu_items", inserted.length > 0);
    }

    // =====================================================================
    // 3) ORDERS — resolve userId / referrerId through the user map.
    //    user_id stays NULL if the original uid could not be resolved
    //    (guest / orphaned order); user_email preserves ownership-by-email.
    // =====================================================================
    const VALID_STATUS = new Set([
      "Attente Acompte",
      "Acompte Reçu",
      "En attente",
      "En cours",
      "Livré",
    ]);
    for (const o of orders) {
      const reference = str(o.reference);
      if (!reference) {
        console.warn(`  (skip) order ${o.id}: missing reference.`);
        continue;
      }
      const status = VALID_STATUS.has(o.status) ? o.status : "Attente Acompte";
      const subtotal = Math.max(0, num(o.subtotal, 0));
      const total = Math.max(0, num(o.total, subtotal));

      const inserted = await sql`
        INSERT INTO orders (
          reference, user_id, user_name, user_email,
          items, subtotal, delivery_fee, total, deposit_amount,
          discounts, status, customer, referrer_id,
          referral_reward_paid, has_reviewed, review,
          delivery_token_hash, delivery_token_exp, delivered_at,
          deletion_requested, created_at, updated_at
        ) VALUES (
          ${reference},
          ${resolveUser(o.userId)},
          ${str(o.userName)},
          ${normEmail(o.userEmail)},
          ${jsonb(sql, o.items ?? [])},
          ${subtotal},
          ${Math.max(0, num(o.deliveryFee, 0))},
          ${total},
          ${Math.max(0, num(o.depositAmount, 0))},
          ${jsonb(sql, o.discounts)},
          ${status},
          ${jsonb(sql, o.customer ?? {})},
          ${resolveUser(o.referrerId)},
          ${bool(o.referralRewardPaid)},
          ${bool(o.hasReviewed)},
          ${jsonb(sql, o.review)},
          ${str(o.deliveryTokenHash)},
          ${o.deliveryTokenExp != null ? Math.trunc(num(o.deliveryTokenExp, 0)) : null},
          ${ts(o.deliveredAt)},
          ${bool(o.deletionRequested)},
          ${ts(o.createdAt) ?? sql`now()`},
          ${ts(o.updatedAt) ?? sql`now()`}
        )
        ON CONFLICT (reference) DO NOTHING
        RETURNING id
      `;
      bump("orders", inserted.length > 0);
    }

    // =====================================================================
    // 4) NEWSLETTER — unique on email.
    // =====================================================================
    for (const n of newsletter) {
      const email = normEmail(n.email);
      if (!email) continue;
      const inserted = await sql`
        INSERT INTO newsletter (email, source, created_at)
        VALUES (${email}, ${str(n.source)}, ${ts(n.createdAt) ?? sql`now()`})
        ON CONFLICT (email) DO NOTHING
        RETURNING id
      `;
      bump("newsletter", inserted.length > 0);
    }

    // =====================================================================
    // 5) PRESTATIONS — no natural unique key in the source, so we guard
    //    against duplicates on re-run via a (email, created_at) existence
    //    check before inserting.
    // =====================================================================
    for (const p of prestations) {
      const email = normEmail(p.email);
      const name = str(p.name);
      if (!email || !name) continue;
      const createdAt = ts(p.createdAt) ?? new Date();

      const existing = await sql`
        SELECT 1 FROM prestations
         WHERE email = ${email} AND created_at = ${createdAt}
         LIMIT 1
      `;
      if (existing.length > 0) {
        bump("prestations", false);
        continue;
      }
      await sql`
        INSERT INTO prestations (email, name, phone, type, message, user_id, created_at)
        VALUES (
          ${email},
          ${name},
          ${str(p.phone)},
          ${str(p.type)},
          ${str(p.message)},
          ${resolveUser(p.userId)},
          ${createdAt}
        )
      `;
      bump("prestations", true);
    }

    // =====================================================================
    // 6) SETTINGS — key/value. Source doc ids (global|promotions|closures)
    //    become the key. The whole document (minus id) becomes value JSONB.
    //    DO NOTHING preserves any seed/admin-edited row already in place.
    // =====================================================================
    for (const s of settings) {
      const key = str(s.id);
      if (!key) continue;
      const { id, ...value } = s;
      void id;
      const inserted = await sql`
        INSERT INTO settings (key, value)
        VALUES (${key}, ${sql.json(value)})
        ON CONFLICT (key) DO NOTHING
        RETURNING key
      `;
      bump("settings", inserted.length > 0);
    }

    // ----- report -----
    console.log("\nImport complete. Newly-inserted rows per table:");
    const tables = ["users", "menu_items", "orders", "newsletter", "prestations", "settings"];
    for (const t of tables) {
      console.log(`  ${t.padEnd(14)} ${String(stats[t] || 0).padStart(6)}`);
    }
    console.log(
      "\nNOTE: password_hash is NULL for all migrated users — they must use " +
        "'forgot password' to set a password (Firebase hashes are not exportable).",
    );
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((err) => {
  console.error("\nImport failed:", err);
  process.exit(1);
});
