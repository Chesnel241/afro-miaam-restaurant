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
  getDoc,
  getDocs,
  setDoc,
  collection,
  query,
  where,
  onSnapshot,
  updateDoc,
  addDoc,
  serverTimestamp,
  orderBy,
  increment,
  or,
  limit,
  runTransaction,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { menuItems } from "@/data/menu";

// ─── Constants ──────────────────────────────────────────────
const googleProvider = new GoogleAuthProvider();

// ─── Types ──────────────────────────────────────────────────
export type UserRole = "customer" | "admin" | "deleted";
export type OrderStatus = "Attente Acompte" | "Acompte Reçu" | "En attente" | "En cours" | "Livré";

export type OrderItem = {
  name: string;
  quantity: number;
  price: number;
};

export type Order = {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  createdAt: string;
  hasReviewed?: boolean;
  referrerId?: string;
  review?: any;
};

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

export type Flavor = {
  name: string;
  supplement: number;
};

export type MenuItemDynamic = {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
  tags?: string[];
  available: boolean;
  flavors?: Flavor[];
  preferences?: string[];
  allergensList?: { id: string; name: string; emoji: string; value: string }[];
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
  // Auth
  loginWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, name: string, phone: string, subscribeNewsletter?: boolean) => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
  deleteAccount: () => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  // Orders (client)
  userOrders: Order[];
  // Orders (admin)
  allOrders: Order[];
  allCustomers: UserProfile[];
  newsletterSubscribers: NewsletterSubscriber[];
  dynamicMenu: MenuItemDynamic[];
  // Order Actions
  updateOrderStatus: (orderId: string, newStatus: OrderStatus) => Promise<void>;
  requestOrderDeletion: (orderId: string) => Promise<void>;
  confirmOrderDeletion: (orderId: string, approved: boolean) => Promise<void>;
  // Menu Actions
  addMenuItem: (item: Omit<MenuItemDynamic, "id">) => Promise<void>;
  updateMenuItem: (id: string, item: Partial<MenuItemDynamic>) => Promise<void>;
  deleteMenuItem: (id: string) => Promise<void>;
  isReviewRewardActive: boolean;
  isWelcomeOfferActive: boolean;
  addOrderReview: (orderId: string, reaction: "bon" | "moyen" | "pas_bon") => Promise<void>;
  updateGlobalSettings: (settings: Record<string, boolean>) => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ─── Helpers ────────────────────────────────────────────────

async function createInitialProfile(uid: string, email: string, displayName?: string | null): Promise<UserProfile> {
  const name = displayName || email.split("@")[0];
  const userRef = doc(db, "users", uid);

  // 8 caractères dans un alphabet sans ambiguïté → 32^8 ≈ 1 000 milliards combinaisons
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

function docToOrder(id: string, data: Record<string, unknown>): Order {
  let dateStr = "";
  const createdAt = data.createdAt;

  if (createdAt && typeof (createdAt as any).toDate === "function") {
    // Cas Firebase Timestamp
    dateStr = (createdAt as any).toDate().toISOString();
  } else if (createdAt instanceof Date) {
    // Cas Date JS
    dateStr = createdAt.toISOString();
  } else if (typeof createdAt === "string") {
    // Cas déjà string
    dateStr = createdAt;
  } else {
    // Fallback date actuelle
    dateStr = new Date().toISOString();
  }

  return {
    id,
    userId: (data.userId as string) || "",
    userName: (data.userName as string) || "",
    userEmail: (data.userEmail as string) || "",
    items: (data.items as OrderItem[]) || [],
    total: (data.total as number) || 0,
    status: (data.status as OrderStatus) || "En attente",
    createdAt: dateStr,
    hasReviewed: (data.hasReviewed as boolean) || false,
    review: (data.review as any) || null,
  };
}

// ─── Provider ───────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [userOrders, setUserOrders] = useState<Order[]>([]);
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [allCustomers, setAllCustomers] = useState<UserProfile[]>([]);
  const [newsletterSubscribers, setNewsletterSubscribers] = useState<NewsletterSubscriber[]>([]);
  const [dynamicMenu, setDynamicMenu] = useState<MenuItemDynamic[]>(menuItems as any);

  // ── Finaliser le retour de signInWithRedirect (mobile Google) ──
  // Sans cet appel explicite, le SDK Firebase ne lit l'état pending dans
  // IndexedDB qu'au cours de sa propre init différée, ce qui ajoute 1-3 s
  // avant que onAuthStateChanged ne tire sur mobile.
  useEffect(() => {
    if (!auth) return;
    getRedirectResult(auth).catch((err) => {
      console.warn("REDIRECT_RESULT_ERROR", (err as { code?: string }).code ?? "unknown");
    });
  }, []);

  // ── Écouter l'état d'authentification Firebase et le Profil ──
  useEffect(() => {
    let unsubProfile: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Écouter le document profil en temps réel
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
              // Créer le profil s'il n'existe pas
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
            // Graceful fallback if profile document is unreadable (e.g. App Check blocking Firestore on mobile)
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

  // ── Écouter les commandes de l'utilisateur courant ──
  useEffect(() => {
    if (!user || user.role === "admin") {
      return;
    }

    const q = query(
      collection(db, "orders"),
      or(
        where("userId", "==", user.id),
        where("userEmail", "==", user.email.toLowerCase())
      ),
      orderBy("createdAt", "desc"),
      limit(100)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const orders = snap.docs
          .map((d) => docToOrder(d.id, d.data()))
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        setUserOrders(orders);
      },
      (err) => {
        console.warn("USER_ORDERS_SNAPSHOT_ERROR", err.message);
      }
    );

    return () => {
      unsub();
      setUserOrders([]);
    };
  }, [user?.id, user?.role, user?.email]);

  // ── Écouter TOUTES les commandes (admin uniquement) ──
  useEffect(() => {
    if (!user || user.role !== "admin") {
      return;
    }

    const q = query(collection(db, "orders"), orderBy("createdAt", "desc"), limit(500));

    const unsub = onSnapshot(
      q,
      (snap) => {
        const orders = snap.docs.map((d) => docToOrder(d.id, d.data()));
        setAllOrders(orders);
      },
      (err) => {
        console.warn("ALL_ORDERS_SNAPSHOT_ERROR", err.message);
      }
    );

    return () => {
      unsub();
      setAllOrders([]);
    };
  }, [user?.id, user?.role, user?.email]);

  // ── Charger tous les clients (admin uniquement) ──
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

  // ── Charger les inscrits newsletter (admin uniquement) ──
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

  // ── Charger le menu (pour tout le monde) ──
  useEffect(() => {
    const q = query(collection(db, "menu"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const items = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<MenuItemDynamic, "id">),
        }));

        // Injecter les formules par défaut si elles ne sont pas encore présentes dans Firestore
        const formulas = [
          {
            id: "menu-decouverte",
            category: "formule",
            name: "Menu Découverte",
            description: "1 Entrée + 1 Plat + 1 Accompagnement + 1 Boisson au choix.",
            price: 15.99,
            image: "/logo-afromiaam.png",
            tags: ["Formule Populaire"],
            available: true,
            preferences: ["halal", "nutfree", "glutenfree"],
          },
          {
            id: "menu-gourmand",
            category: "formule",
            name: "Menu Gourmand",
            description: "1 Entrée + 1 Plat Premium + 1 Accompagnement Premium + 1 Dessert + 1 Boisson au choix.",
            price: 24.99,
            image: "/logo-afromiaam.png",
            tags: ["Formule Gourmande"],
            available: true,
            preferences: ["halal", "nutfree", "glutenfree"],
          },
          {
            id: "lait-caille",
            category: "dessert",
            name: "Lait caillé",
            description: "Dessert traditionnel doux et onctueux.",
            price: 4,
            image: "/img/desserts/lait-caille.png",
            tags: [],
            available: true,
            preferences: ["halal", "nutfree", "glutenfree", "veg"],
          }
        ];

        const finalItems = [...items];
        formulas.forEach(f => {
          if (!items.some(it => it.id === f.id || it.name === f.name)) {
            finalItems.push(f as any);
          }
        });

        setDynamicMenu(finalItems);
      },
      (err) => {
        console.warn("MENU_SNAPSHOT_ERROR", err.message);
        // Fallback to static menu items on error so the site is never blank!
        setDynamicMenu(menuItems as any);
      }
    );
    return () => unsub();
  }, []);

  // ── Auth Functions ──

  const loginWithEmail = useCallback(async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  }, []);

  const signUpWithEmail = useCallback(async (email: string, password: string, name: string, phone: string, subscribeNewsletter = false) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);

    // Generate a non-guessable referral code (crypto entropy, ambiguity-free
    // alphabet). 8 chars from 32 symbols → ~1.1 trillion combinations.
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
    // Détection de mobile / tablette pour éviter le blocage des popups Firebase
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
        // En cas de popup bloqué sur desktop, on bascule sur la redirection
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
    setUserOrders([]);
    setAllOrders([]);
    setAllCustomers([]);
    setNewsletterSubscribers([]);
  }, []);

  const deleteAccount = useCallback(async () => {
    if (!auth.currentUser || !user) return;
    const uid = auth.currentUser.uid;
    // Mark the Firestore record as deleted FIRST so admin still has historic
    // visibility (the users/{uid} doc is intentionally NOT removed — it stays
    // with role="deleted" + deletedAt timestamp for audit/reporting).
    await updateDoc(doc(db, "users", uid), {
      deletedAt: serverTimestamp(),
      role: "deleted",
    });
    // Then delete the Firebase Auth user. This prevents the same email from
    // being re-registered, which would mint a fresh UID and a new profile
    // with hasUsedWelcomeOffer=false — letting an attacker replay the 5€
    // welcome offer indefinitely (CRIT-3).
    try {
      await deleteUser(auth.currentUser);
    } catch (err) {
      const code = (err as { code?: string }).code;
      if (code === "auth/requires-recent-login") {
        // Firebase requires a fresh sign-in for sensitive operations.
        throw new Error(
          "Pour supprimer votre compte, veuillez vous reconnecter puis réessayer."
        );
      }
      throw err;
    }
    await signOut(auth);
    setUser(null);
  }, [user]);

  // ── Order Functions ──

  const updateOrderStatus = useCallback(async (orderId: string, newStatus: OrderStatus) => {
    const orderRef = doc(db, "orders", orderId);

    await updateDoc(orderRef, {
      status: newStatus,
      updatedAt: serverTimestamp(),
    });

    if (newStatus === "Livré") {
      const orderSnap = await getDoc(orderRef);
      if (orderSnap.exists()) {
        const orderData = orderSnap.data();
        const userId = orderData.userId as string;

        if (userId) {
          await updateDoc(doc(db, "users", userId), {
            ordersCount: increment(1),
          });
        }

        // ─── Vague2-E/H: idempotent + self-referral-safe referrer reward ──
        // Defense in depth: even though the reservation API now refuses to
        // populate referrerId when it matches the buyer, admin tools may have
        // legacy rows where that guard was absent. Gate the +5€ credit on:
        //   - referrerId !== buyerId  (self-referral block)
        //   - !referralRewardPaid     (idempotency — no double payout if an
        //     admin re-saves "Livré" or this code runs twice)
        // Wrapped in a transaction so the credit + the "paid" flag flip
        // atomically; if either fails neither sticks.
        // ──────────────────────────────────────────────────────────────────
        try {
          await runTransaction(db, async (tx) => {
            const fresh = await tx.get(orderRef);
            if (!fresh.exists()) return;
            const data = fresh.data() || {};
            const referrerId =
              typeof data.referrerId === "string" ? data.referrerId : "";
            const buyerId = typeof data.userId === "string" ? data.userId : "";
            if (
              data.status === "Livré" &&
              referrerId &&
              referrerId !== buyerId &&
              data.referralRewardPaid !== true
            ) {
              const referrerRef = doc(db, "users", referrerId);
              tx.update(referrerRef, { referralCredits: increment(5) });
              tx.update(orderRef, { referralRewardPaid: true });
            }
          });
        } catch (err) {
          console.warn(
            "REFERRAL_REWARD_TX_FAILED",
            (err as { code?: string }).code ?? "unknown",
          );
        }
      }
    }
  }, []);

  const requestOrderDeletion = useCallback(async (orderId: string) => {
    if (!user || user.role !== "admin") return;
    await updateDoc(doc(db, "orders", orderId), {
      deletionRequested: true,
      updatedAt: serverTimestamp(),
    });
  }, [user]);

  const confirmOrderDeletion = useCallback(async (orderId: string, approved: boolean) => {
    const orderRef = doc(db, "orders", orderId);
    
    if (!approved) {
      await updateDoc(orderRef, {
        deletionRequested: false,
        updatedAt: serverTimestamp(),
      });
      return;
    }

    // Si approuvé, on supprime et on met à jour les stats
    const orderSnap = await getDoc(orderRef);
    if (orderSnap.exists()) {
      const orderData = orderSnap.data();
      const userId = orderData.userId as string;
      const wasDelivered = orderData.status === "Livré";

      // On supprime la commande
      const { deleteDoc } = await import("firebase/firestore");
      await deleteDoc(orderRef);

      // Si elle était livrée, on baisse le compteur de fidélité
      if (userId && wasDelivered) {
        await updateDoc(doc(db, "users", userId), {
          ordersCount: increment(-1),
        });
      }
    }
  }, []);

  // ── Menu Actions ──

  const addMenuItem = useCallback(async (item: Omit<MenuItemDynamic, "id">) => {
    if (!user || user.role !== "admin") return;
    await addDoc(collection(db, "menu"), {
      ...item,
      createdAt: serverTimestamp(),
    });
  }, [user]);

  const updateMenuItem = useCallback(async (id: string, item: Partial<MenuItemDynamic>) => {
    if (!user || user.role !== "admin") return;
    await updateDoc(doc(db, "menu", id), {
      ...item,
      updatedAt: serverTimestamp(),
    });
  }, [user]);

  const deleteMenuItem = useCallback(async (id: string) => {
    if (!user || user.role !== "admin") return;
    await updateDoc(doc(db, "menu", id), { available: false, deletedAt: serverTimestamp() });
  }, [user]);

  const addOrderReview = useCallback(async (orderId: string, reaction: 'bon' | 'moyen' | 'pas_bon') => {
    if (!user || !auth.currentUser) return;
    try {
      const token = await auth.currentUser.getIdToken();
      const res = await fetch("/api/review", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ orderId, reaction })
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Erreur lors de la soumission de l'avis");
      }
    } catch (err) {
      console.warn("REVIEW_SUBMISSION_FAILED", (err as Error).message);
      throw err;
    }
  }, [user]);

  const [isReviewRewardActive, setIsReviewRewardActive] = useState(true);
  const [isWelcomeOfferActive, setIsWelcomeOfferActive] = useState(true);

  useEffect(() => {
    // Firestore rules require auth for settings reads (C10).
    // Only subscribe when logged-in to avoid permission-denied errors.
    if (!user) return;

    const unsub = onSnapshot(
      doc(db, "settings", "global"),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setIsReviewRewardActive(data.isReviewRewardActive ?? true);
          setIsWelcomeOfferActive(data.isWelcomeOfferActive ?? true);
        }
      },
      (err) => {
        // Graceful degradation: keep the default (true) if read fails.
        console.warn("SETTINGS_SNAPSHOT_ERROR", (err as { code?: string }).code ?? "unknown");
      },
    );
    return () => unsub();
  }, [user?.id, user?.role, user?.email]);

  const updateGlobalSettings = useCallback(async (settings: Record<string, boolean>) => {
    const settingsRef = doc(db, "settings", "global");
    await setDoc(settingsRef, settings, { merge: true });
  }, []);

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
      userOrders,
      allOrders,
      allCustomers,
      newsletterSubscribers,
      dynamicMenu,
      isReviewRewardActive,
      isWelcomeOfferActive,
      addOrderReview,
      updateGlobalSettings,
      updateOrderStatus,
      requestOrderDeletion,
      confirmOrderDeletion,
      addMenuItem,
      updateMenuItem,
      deleteMenuItem,
    }),
    [
      user,
      loading,
      userOrders,
      allOrders,
      allCustomers,
      newsletterSubscribers,
      dynamicMenu,
      isReviewRewardActive,
      isWelcomeOfferActive,
      loginWithEmail,
      signUpWithEmail,
      updateProfile,
      loginWithGoogle,
      logoutFn,
      deleteAccount,
      updateOrderStatus,
      requestOrderDeletion,
      confirmOrderDeletion,
      addMenuItem,
      updateMenuItem,
      deleteMenuItem,
      addOrderReview,
      updateGlobalSettings,
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
