#!/usr/bin/env node
// =============================================================================
// export-firestore.mjs — one-time Firestore → JSON dump.
// =============================================================================
// Reads every source collection and writes ./migration-data/<collection>.json
// as an array of { id, ...data }. Firestore Timestamps are converted to ISO
// strings so the import step can hand them straight to Postgres.
//
// Usage:
//   FIREBASE_SERVICE_ACCOUNT='<json-or-base64>' node scripts/export-firestore.mjs
//
// FIREBASE_SERVICE_ACCOUNT parsing mirrors src/lib/firebase-admin.ts exactly
// (plain JSON first, then base64 → JSON fallback).
// =============================================================================

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import admin from "firebase-admin";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(__dirname, "..", "migration-data");

// Collections to export. Document ids are preserved as `id`.
const COLLECTIONS = [
  "users",
  "orders",
  "menu",
  "newsletter",
  "prestations",
  "settings",
];

// ---------------------------------------------------------------------------
// Service-account parsing — copied from src/lib/firebase-admin.ts.
// ---------------------------------------------------------------------------
function parseServiceAccount(raw) {
  // Try plain JSON first.
  try {
    return JSON.parse(raw);
  } catch {
    // Fall back to base64 → JSON.
    let decoded;
    try {
      decoded = Buffer.from(raw, "base64").toString("utf-8");
    } catch {
      throw new Error("FIREBASE_SERVICE_ACCOUNT: ni JSON valide ni base64 décodable.");
    }
    try {
      return JSON.parse(decoded);
    } catch {
      throw new Error("FIREBASE_SERVICE_ACCOUNT: base64 décodé mais JSON résultant invalide.");
    }
  }
}

// ---------------------------------------------------------------------------
// Recursively convert Firestore values into JSON-serialisable values:
//   * Timestamp        → ISO string
//   * GeoPoint         → { latitude, longitude }
//   * DocumentReference→ path string
//   * Buffer/Bytes     → base64 string
//   * arrays / maps    → recursed
// ---------------------------------------------------------------------------
function convertValue(value) {
  if (value === null || value === undefined) return value ?? null;

  // Firestore Timestamp (admin SDK instance or {seconds, nanoseconds} plain).
  if (typeof value?.toDate === "function") {
    return value.toDate().toISOString();
  }
  if (
    typeof value === "object" &&
    typeof value.seconds === "number" &&
    typeof value.nanoseconds === "number" &&
    Object.keys(value).length === 2
  ) {
    return new Date(value.seconds * 1000 + Math.round(value.nanoseconds / 1e6)).toISOString();
  }

  // GeoPoint.
  if (typeof value?.latitude === "number" && typeof value?.longitude === "number") {
    return { latitude: value.latitude, longitude: value.longitude };
  }

  // DocumentReference.
  if (typeof value?.path === "string" && typeof value?.id === "string" && value?.firestore) {
    return value.path;
  }

  // Bytes / Buffer.
  if (Buffer.isBuffer(value)) {
    return value.toString("base64");
  }

  if (Array.isArray(value)) {
    return value.map(convertValue);
  }

  if (typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = convertValue(v);
    }
    return out;
  }

  return value;
}

async function main() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw || !raw.trim()) {
    console.error("ERROR: FIREBASE_SERVICE_ACCOUNT is not set.");
    process.exit(1);
  }

  const serviceAccount = parseServiceAccount(raw);
  const projectId = serviceAccount.project_id ?? serviceAccount.projectId;
  if (!projectId) {
    console.error("ERROR: service account has no project_id.");
    process.exit(1);
  }

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId,
    });
  }
  const db = admin.firestore();

  await mkdir(OUTPUT_DIR, { recursive: true });
  console.log(`Exporting Firestore project "${projectId}" → ${OUTPUT_DIR}\n`);

  let grandTotal = 0;
  for (const collection of COLLECTIONS) {
    const snapshot = await db.collection(collection).get();
    const docs = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...convertValue(doc.data()),
    }));

    const outFile = join(OUTPUT_DIR, `${collection}.json`);
    await writeFile(outFile, JSON.stringify(docs, null, 2), "utf-8");

    grandTotal += docs.length;
    console.log(`  ${collection.padEnd(14)} ${String(docs.length).padStart(6)} docs → ${collection}.json`);
  }

  console.log(`\nDone. ${grandTotal} documents exported across ${COLLECTIONS.length} collections.`);
}

main().catch((err) => {
  console.error("\nExport failed:", err);
  process.exit(1);
});
