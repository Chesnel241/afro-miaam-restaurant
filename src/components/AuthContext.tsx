"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
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
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

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
  placeOrder: (items: OrderItem[], total: number, discounts?: { referralCredits?: number, welcomeOffer?: boolean, referralCodeUsed?: string }) => Promise<void>;
  updateOrderStatus: (orderId: string, newStatus: OrderStatus) => Promise<void>;
  requestOrderDeletion: (orderId: string) => Promise<void>;
  confirmOrderDeletion: (orderId: string, approved: boolean) => Promise<void>;
  // Menu Actions
  addMenuItem: (item: Omit<MenuItemDynamic, "id">) => Promise<void>;
  updateMenuItem: (id: string, item: Partial<MenuItemDynamic>) => Promise<void>;
  deleteMenuItem: (id: string) => Promise<void>;
  isReviewRewardActive: boolean;
  addOrderReview: (orderId: string, rating: number, comment: string) => Promise<void>;
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
  const [dynamicMenu, setDynamicMenu] = useState<MenuItemDynamic[]>([]);

  // ── Écouter l'état d'authentification Firebase et le Profil ──
  useEffect(() => {
    let unsubProfile: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Écouter le document profil en temps réel
        const userRef = doc(db, "users", firebaseUser.uid);
        
        unsubProfile = onSnapshot(userRef, async (snap) => {
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
        });
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
      )
    );

    const unsub = onSnapshot(q, (snap) => {
      const orders = snap.docs
        .map((d) => docToOrder(d.id, d.data()))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      setUserOrders(orders);
    });

    return () => {
      unsub();
      setUserOrders([]);
    };
  }, [user]);

  // ── Écouter TOUTES les commandes (admin uniquement) ──
  useEffect(() => {
    if (!user || user.role !== "admin") {
      return;
    }

    const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));

    const unsub = onSnapshot(q, (snap) => {
      const orders = snap.docs.map((d) => docToOrder(d.id, d.data()));
      setAllOrders(orders);
    });

    return () => {
      unsub();
      setAllOrders([]);
    };
  }, [user]);

  // ── Charger tous les clients (admin uniquement) ──
  useEffect(() => {
    if (!user || user.role !== "admin") {
      return;
    }

    const q = query(collection(db, "users"), where("role", "==", "customer"));

    const unsub = onSnapshot(q, (snap) => {
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
    });

    return () => {
      unsub();
      setAllCustomers([]);
    };
  }, [user]);

  // ── Charger les inscrits newsletter (admin uniquement) ──
  useEffect(() => {
    if (!user || user.role !== "admin") {
      return;
    }

    const q = query(collection(db, "newsletter"), orderBy("createdAt", "desc"));

    const unsub = onSnapshot(q, (snap) => {
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
    });

    return () => {
      unsub();
      setNewsletterSubscribers([]);
    };
  }, [user]);

  // ── Charger le menu (pour tout le monde) ──
  useEffect(() => {
    const q = query(collection(db, "menu"));
    const unsub = onSnapshot(q, (snap) => {
      const items = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<MenuItemDynamic, "id">),
      }));
      setDynamicMenu(items);
    });
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
    await signInWithPopup(auth, googleProvider);
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

  const placeOrder = useCallback(async (items: OrderItem[], total: number, discounts?: { referralCredits?: number, welcomeOffer?: boolean, referralCodeUsed?: string }) => {
    if (!user) throw new Error("Non connecté");

    const orderData = {
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      items,
      total,
      discounts: discounts || null,
      status: "En attente" as OrderStatus,
      createdAt: serverTimestamp(),
    };

    const orderRef = await addDoc(collection(db, "orders"), orderData);

    // Mise à jour du profil utilisateur (réduction des crédits, marquage offre bienvenue)
    const userUpdate: any = {};
    if (discounts?.referralCredits) {
      userUpdate.referralCredits = increment(-discounts.referralCredits);
    }
    if (discounts?.welcomeOffer) {
      userUpdate.hasUsedWelcomeOffer = true;
    }
    
    if (Object.keys(userUpdate).length > 0) {
      await updateDoc(doc(db, "users", user.id), userUpdate);
    }

    // Si un code de parrainage a été utilisé, on cherche le parrain
    if (discounts?.referralCodeUsed) {
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("referralCode", "==", discounts.referralCodeUsed));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const parrainDoc = querySnapshot.docs[0];
        // On marque la commande avec l'ID du parrain pour lui donner ses 5€ quand la commande sera LIVRÉE
        await updateDoc(orderRef, { referrerId: parrainDoc.id });
      }
    }
  }, [user]);

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
        const referrerId = orderData.referrerId as string;

        if (userId) {
          await updateDoc(doc(db, "users", userId), {
            ordersCount: increment(1),
          });
        }

        // Récompense du parrain (5€ de crédit)
        if (referrerId) {
          await updateDoc(doc(db, "users", referrerId), {
            referralCredits: increment(5),
          });
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

  const addOrderReview = useCallback(async (orderId: string, rating: number, comment: string) => {
    if (!user) return;
    try {
      // Read first to enforce one-review-per-order at the client level too.
      // Defense in depth: the Firestore rule also rejects the update when
      // hasReviewed is already true.
      const orderRef = doc(db, "orders", orderId);
      const snap = await getDoc(orderRef);
      if (!snap.exists()) throw new Error("ORDER_NOT_FOUND");
      const existing = snap.data() as { userId?: string; hasReviewed?: boolean };
      if (existing.userId !== user.id) throw new Error("FORBIDDEN");
      if (existing.hasReviewed === true) throw new Error("ALREADY_REVIEWED");

      await updateDoc(orderRef, {
        hasReviewed: true,
        review: { rating, comment, createdAt: serverTimestamp() },
      });

      // NOTE: referralCredits reward is NOT incremented from the client.
      // The hardened users/update rule only allows credits to DECREASE
      // (anti-farming). Credits for reviews are granted manually by admin
      // until an Admin SDK API moves this server-side.
    } catch (err) {
      console.warn("REVIEW_SUBMISSION_FAILED", (err as { code?: string; message?: string }).code ?? (err as Error).message ?? "unknown");
      throw err;
    }
  }, [user]);

  const [isReviewRewardActive, setIsReviewRewardActive] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "settings", "global"), (snap) => {
      if (snap.exists()) {
        setIsReviewRewardActive(snap.data().isReviewRewardActive ?? true);
      }
    });
    return () => unsub();
  }, []);

  return (
    <AuthContext.Provider
      value={{
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
        placeOrder,
        isReviewRewardActive,
        addOrderReview,
        updateOrderStatus,
        requestOrderDeletion,
        confirmOrderDeletion,
        addMenuItem,
        updateMenuItem,
        deleteMenuItem,
      }}
    >
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
