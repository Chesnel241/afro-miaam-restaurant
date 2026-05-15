import * as admin from "firebase-admin";
import { getApps } from "firebase-admin/app";

// Initialisation sécurisée du SDK Admin
if (!getApps().length) {
  try {
    // Si la variable d'environnement est présente, on l'utilise
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
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
