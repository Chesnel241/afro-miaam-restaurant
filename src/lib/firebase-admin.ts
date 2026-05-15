import * as admin from "firebase-admin";
import { getApps } from "firebase-admin/app";

// Initialisation sécurisée du SDK Admin
if (!getApps().length) {
  try {
    // Si la variable d'environnement est présente, on l'utilise
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      let serviceAccount;
      try {
        // Tenter de parser directement (si c'est du JSON clair)
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      } catch {
        // Si ça échoue, tenter de décoder le Base64
        const decoded = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT, 'base64').toString('utf-8');
        serviceAccount = JSON.parse(decoded);
      }
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    } else {
      // Fallback par défaut (fonctionne avec GOOGLE_APPLICATION_CREDENTIALS ou en environnement Google Cloud)
      admin.initializeApp();
    }
  } catch (error) {
    console.error("Erreur lors de l'initialisation de Firebase Admin:", error);
  }
}

export const adminDb = admin.firestore();
export const adminAuth = admin.auth();
