import * as admin from "firebase-admin";
import { getApps } from "firebase-admin/app";

// Initialisation Firebase Admin SDK.
// HIGH-1 (pass 6): fail loudly at init if credentials are misconfigured.
// The previous version swallowed exceptions and exported uninitialized
// adminDb/adminAuth, leading to generic 401s with no clue for the operator.

function parseServiceAccount(raw: string): admin.ServiceAccount {
  // Try plain JSON first.
  try {
    return JSON.parse(raw);
  } catch {
    // Fall back to base64 → JSON.
    let decoded: string;
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

if (!getApps().length) {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const serviceAccount = parseServiceAccount(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.K_SERVICE) {
    // Application Default Credentials (Cloud Run / GCP).
    admin.initializeApp();
  } else {
    // Pas de credentials configurés.
    // - En build (next build) ou en dev local, on init vide pour permettre
    //   la compilation des routes. Les appels Admin SDK runtime échoueront
    //   proprement avec un 401 explicite côté API.
    // - Si on est en runtime production sur Vercel sans creds, ce warning
    //   apparaît dans les logs et chaque request /api/reservation renvoie
    //   401 — l'opérateur peut diagnostiquer.
    const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build";
    if (process.env.NODE_ENV === "production" && !isBuildPhase) {
      console.error(
        "[firebase-admin] CONFIG ERROR: ni FIREBASE_SERVICE_ACCOUNT ni GOOGLE_APPLICATION_CREDENTIALS défini en production. Les appels API échoueront.",
      );
    } else {
      console.warn(
        "[firebase-admin] Aucun credential configuré (build / dev). Les appels Admin SDK échoueront.",
      );
    }
    admin.initializeApp();
  }
}

export const adminDb = admin.firestore();
export const adminAuth = admin.auth();
