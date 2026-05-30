"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  signOut,
  deleteUser,
} from "firebase/auth";
import {
  doc,
  collection,
  query,
  where,
  onSnapshot,
  updateDoc,
  addDoc,
  serverTimestamp,
  orderBy,
  limit,
  setDoc,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

export type UserRole = "customer" | "admin" | "deleted";

export type UserProfile = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  ordersCount: number;
  isFirstLogin?: boolean;
  referralCode?: string;
  referralCredits?: number;
  hasUsedWelcomeOffer?: boolean;
  referredBy?: string;
  createdAt?: any;
};

export type NewsletterSubscriber = {
  id: string;
  email: string;
  createdAt: string;
  source: string;
};

type AuthContextType = {
  user: UserProfile | null;
  loading: boolean;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, name: string, phone: string, subscribeNewsletter?: boolean) => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
  deleteAccount: () => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  allCustomers: UserProfile[];
  newsletterSubscribers: NewsletterSubscriber[];
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const googleProvider = new GoogleAuthProvider();

async function createInitialProfile(uid: string, email: string, displayName?: string | null): Promise<UserProfile> {
  const name = displayName || email.split("@")[0];
  const userRef = doc(db, "users", uid);

  const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  const suffix = Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
  const referralCode = `AFRO-${name.split(" ")[0].toUpperCase().substring(0, 4)}-${suffix}`;

  const profile = {
    name,
    email: email.trim().toLowerCase(),
    phone: "",
    role: "customer" as UserRole,
    ordersCount: 0,
    isFirstLogin: true,
    referralCode,
    referralCredits: 0,
    hasUsedWelcomeOffer: false,
    createdAt: serverTimestamp(),
  };

  await setDoc(userRef, profile);
  return { id: uid, ...profile };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [allCustomers, setAllCustomers] = useState<UserProfile[]>([]);
  const [newsletterSubscribers, setNewsletterSubscribers] = useState<NewsletterSubscriber[]>([]);

  useEffect(() => {
    if (!auth) return;
    getRedirectResult(auth).catch((err) => {
      console.warn("REDIRECT_RESULT_ERROR", (err as { code?: string }).code ?? "unknown");
    });
  }, []);

  useEffect(() => {
    let unsubProfile: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userRef = doc(db, "users", firebaseUser.uid);

        if (unsubProfile) unsubProfile();
        unsubProfile = onSnapshot(
          userRef,
          async (snap) => {
            if (snap.exists()) {
              const data = snap.data();
              setUser({
                id: firebaseUser.uid,
                name: data.name || "",
                email: data.email || firebaseUser.email || "",
                phone: data.phone || "",
                role: data.role || "customer",
                ordersCount: data.ordersCount || 0,
                isFirstLogin: data.isFirstLogin ?? false,
                referralCode: data.referralCode || "",
                referralCredits: data.referralCredits || 0,
                hasUsedWelcomeOffer: data.hasUsedWelcomeOffer ?? false,
                referredBy: data.referredBy || "",
              });
            } else {
              const newProfile = await createInitialProfile(
                firebaseUser.uid,
                firebaseUser.email || "",
                firebaseUser.displayName
              );
              setUser(newProfile);
            }
            setLoading(false);
          },
          (err) => {
            console.error("PROFILE_SNAPSHOT_ERROR", err.message);
            setUser({
              id: firebaseUser.uid,
              name: firebaseUser.displayName || firebaseUser.email?.split("@")[0] || "Client",
              email: firebaseUser.email || "",
              phone: "",
              role: "customer",
              ordersCount: 0,
              isFirstLogin: false,
              referralCode: "",
              referralCredits: 0,
              hasUsedWelcomeOffer: false,
            });
            setLoading(false);
          }
        );
      } else {
        if (unsubProfile) unsubProfile();
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
      unsubAuth();
      if (unsubProfile) unsubProfile();
    };
  }, []);

  useEffect(() => {
    if (!user || user.role !== "admin") {
      return;
    }

    const q = query(collection(db, "users"), where("role", "==", "customer"), limit(500));

    const unsub = onSnapshot(
      q,
      (snap) => {
        const customers = snap.docs.map((d) => {
          const data = d.data();
            return {
              id: d.id,
              name: (data.name as string) || "",
              email: (data.email as string) || "",
              phone: (data.phone as string) || "",
              role: "customer" as UserRole,
              ordersCount: (data.ordersCount as number) || 0,
            };
        });
        setAllCustomers(customers);
      },
      (err) => {
        console.warn("ALL_CUSTOMERS_SNAPSHOT_ERROR", err.message);
      }
    );

    return () => {
      unsub();
      setAllCustomers([]);
    };
  }, [user?.id, user?.role, user?.email]);

  useEffect(() => {
    if (!user || user.role !== "admin") {
      return;
    }

    const q = query(collection(db, "newsletter"), orderBy("createdAt", "desc"), limit(500));

    const unsub = onSnapshot(
      q,
      (snap) => {
        const subs = snap.docs.map((d) => {
          const data = d.data();
          let dateStr = "";
          const ts = data.createdAt as { toDate?: () => Date } | undefined;
          if (ts && typeof ts.toDate === "function") {
            dateStr = ts.toDate().toISOString().split("T")[0];
          } else {
            dateStr = new Date().toISOString().split("T")[0];
          }
          return {
            id: d.id,
            email: (data.email as string) || "",
            createdAt: dateStr,
            source: (data.source as string) || "inconnu",
          };
        });
        setNewsletterSubscribers(subs);
      },
      (err) => {
        console.warn("NEWSLETTER_SUBSCRIBERS_SNAPSHOT_ERROR", err.message);
      }
    );

    return () => {
      unsub();
      setNewsletterSubscribers([]);
    };
  }, [user?.id, user?.role, user?.email]);

  const loginWithEmail = useCallback(async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  }, []);

  const signUpWithEmail = useCallback(async (email: string, password: string, name: string, phone: string, subscribeNewsletter = false) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);

    const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const bytes = new Uint8Array(8);
    crypto.getRandomValues(bytes);
    const suffix = Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
    const referralCode = `AFRO-${(name.split(" ")[0] || "USR").toUpperCase().substring(0, 4)}-${suffix}`;

    await setDoc(doc(db, "users", cred.user.uid), {
      name,
      email: email.trim().toLowerCase(),
      phone,
      role: "customer",
      ordersCount: 0,
      isFirstLogin: true,
      referralCode,
      referralCredits: 0,
      hasUsedWelcomeOffer: false,
      createdAt: serverTimestamp(),
      subscribeNewsletter,
    });

    if (subscribeNewsletter) {
      await addDoc(collection(db, "newsletter"), {
        email: email.trim().toLowerCase(),
        createdAt: serverTimestamp(),
        source: "inscription",
      });
    }
  }, []);

  const updateProfile = useCallback(async (data: Partial<UserProfile>) => {
    if (!user) return;
    await updateDoc(doc(db, "users", user.id), {
      ...data,
      updatedAt: serverTimestamp(),
    });
  }, [user]);

  const loginWithGoogle = useCallback(async () => {
    const isMobile = typeof window !== "undefined" && (
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
      (window.innerWidth <= 768)
    );

    if (isMobile) {
      await signInWithRedirect(auth, googleProvider);
    } else {
      try {
        await signInWithPopup(auth, googleProvider);
      } catch (err: any) {
        if (err.code === "auth/popup-blocked" || err.code === "auth/cancelled-popup-request") {
          await signInWithRedirect(auth, googleProvider);
        } else {
          throw err;
        }
      }
    }
  }, []);

  const logoutFn = useCallback(async () => {
    await signOut(auth);
    setUser(null);
    setAllCustomers([]);
    setNewsletterSubscribers([]);
  }, []);

  const deleteAccount = useCallback(async () => {
    if (!auth.currentUser || !user) return;
    const uid = auth.currentUser.uid;
    await updateDoc(doc(db, "users", uid), {
      deletedAt: serverTimestamp(),
      role: "deleted",
    });
    try {
      await deleteUser(auth.currentUser);
    } catch (err) {
      const code = (err as { code?: string }).code;
      if (code === "auth/requires-recent-login") {
        throw new Error(
          "Pour supprimer votre compte, veuillez vous reconnecter puis réessayer."
        );
      }
      throw err;
    }
    await signOut(auth);
    setUser(null);
  }, [user]);

  const contextValue = useMemo(
    () => ({
      user,
      loading,
      loginWithEmail,
      signUpWithEmail,
      updateProfile,
      loginWithGoogle,
      logout: logoutFn,
      deleteAccount,
      allCustomers,
      newsletterSubscribers,
    }),
    [
      user,
      loading,
      loginWithEmail,
      signUpWithEmail,
      updateProfile,
      loginWithGoogle,
      logoutFn,
      deleteAccount,
      allCustomers,
      newsletterSubscribers,
    ]
  );

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth doit être utilisé à l'intérieur d'un AuthProvider");
  }
  return context;
}
