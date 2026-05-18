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

function getExpectedProjectId(): string | null {
  const candidates = [
    process.env.FIREBASE_PROJECT_ID,
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    process.env.GOOGLE_CLOUD_PROJECT,
    process.env.GCLOUD_PROJECT,
    process.env.PROJECT_ID,
  ];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }
  return null;
}

function assertProjectId(source: string, actualProjectId: string): string {
  if (!actualProjectId || !actualProjectId.trim()) {
    throw new Error(`[firebase-admin] CONFIG ERROR: ${source} ne contient pas de project_id.`);
  }

  const expectedProjectId = getExpectedProjectId();
  if (expectedProjectId && expectedProjectId !== actualProjectId) {
    throw new Error(
      `[firebase-admin] CONFIG ERROR: ${source} project_id="${actualProjectId}" ne correspond pas au project attendu "${expectedProjectId}".`,
    );
  }

  return actualProjectId;
}

if (!getApps().length) {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const serviceAccount = parseServiceAccount(process.env.FIREBASE_SERVICE_ACCOUNT);
    const serviceAccountProjectId =
      (serviceAccount as admin.ServiceAccount & { project_id?: string }).project_id ??
      serviceAccount.projectId ??
      "";
    const projectId = assertProjectId("FIREBASE_SERVICE_ACCOUNT", serviceAccountProjectId);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId,
    });
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.K_SERVICE) {
    // Application Default Credentials (Cloud Run / GCP).
    const projectId = getExpectedProjectId();
    admin.initializeApp(projectId ? { projectId } : undefined);
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

const db = admin.firestore();
db.settings({ ignoreUndefinedProperties: true });
export const adminDb = db;
export const adminAuth = admin.auth();

export async function verifyAppCheckToken(appCheckToken: string) {
  if (!appCheckToken || !appCheckToken.trim()) {
    throw new Error("App Check token manquant.");
  }
  return admin.appCheck().verifyToken(appCheckToken);
}
