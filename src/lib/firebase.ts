import { initializeApp, getApps } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";
import {
  initializeAppCheck,
  ReCaptchaV3Provider,
  type AppCheck,
} from "firebase/app-check";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const hasFirebaseConfig = Object.values(firebaseConfig).every(
  (value) => typeof value === "string" && value.trim().length > 0,
);

const app =
  getApps().length > 0
    ? getApps()[0]
    : hasFirebaseConfig
      ? initializeApp(firebaseConfig)
      : null;

let appCheck: AppCheck | undefined;
if (typeof window !== "undefined" && app) {
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
  if (siteKey) {
    try {
      appCheck = initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(siteKey),
        isTokenAutoRefreshEnabled: true,
      });
    } catch (e) {
      console.warn("APP_CHECK_INIT_FAILED", (e as { code?: string }).code ?? "unknown");
    }
  }
}

export { appCheck };
export const auth: Auth = app ? getAuth(app) : (undefined as unknown as Auth);
export const db: Firestore = app
  ? getFirestore(app)
  : (undefined as unknown as Firestore);
export const storage: FirebaseStorage = app
  ? getStorage(app)
  : (undefined as unknown as FirebaseStorage);
