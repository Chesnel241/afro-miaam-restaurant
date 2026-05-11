"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
} from "firebase/auth";
import {
  doc,
  getDoc,
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
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

// ─── Constants ──────────────────────────────────────────────
const googleProvider = new GoogleAuthProvider();

// ─── Types ──────────────────────────────────────────────────
export type UserRole = "customer" | "admin";
export type OrderStatus = "En attente" | "En cours" | "Livré";

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
};

export type UserProfile = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  ordersCount: number;
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
  signUpWithEmail: (email: string, password: string, name: string, subscribeNewsletter?: boolean) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  // Orders (client)
  userOrders: Order[];
  // Orders (admin)
  allOrders: Order[];
  allCustomers: UserProfile[];
  newsletterSubscribers: NewsletterSubscriber[];
  // Actions
  placeOrder: (items: OrderItem[], total: number) => Promise<void>;
  updateOrderStatus: (orderId: string, newStatus: OrderStatus) => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ─── Helpers ────────────────────────────────────────────────

/** Crée ou met à jour le profil utilisateur dans Firestore */
async function ensureUserProfile(uid: string, email: string, displayName?: string | null): Promise<UserProfile> {
  const userRef = doc(db, "users", uid);
  const snap = await getDoc(userRef);

  if (snap.exists()) {
    const data = snap.data();
    return {
      id: uid,
      name: data.name || displayName || email.split("@")[0],
      email: data.email || email,
      role: data.role || "customer",
      ordersCount: data.ordersCount || 0,
    };
  }

  // Nouveau compte : toujours créé comme "customer".
  // Le rôle "admin" doit être attribué manuellement dans la console Firestore.
  const name = displayName || email.split("@")[0];

  const profile: Omit<UserProfile, "id"> & { createdAt: ReturnType<typeof serverTimestamp> } = {
    name,
    email,
    role: "customer" as UserRole,
    ordersCount: 0,
    createdAt: serverTimestamp(),
  };

  await setDoc(userRef, profile);

  return { id: uid, name, email, role: "customer" as UserRole, ordersCount: 0 };
}

/** Convertit un document Firestore en Order */
function docToOrder(id: string, data: Record<string, unknown>): Order {
  let dateStr = "";
  const ts = data.createdAt as { toDate?: () => Date } | undefined;
  if (ts && typeof ts.toDate === "function") {
    dateStr = ts.toDate().toISOString().split("T")[0];
  } else if (typeof data.createdAt === "string") {
    dateStr = data.createdAt;
  } else {
    dateStr = new Date().toISOString().split("T")[0];
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

  // ── Écouter l'état d'authentification Firebase ──
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const profile = await ensureUserProfile(
            firebaseUser.uid,
            firebaseUser.email || "",
            firebaseUser.displayName
          );
          setUser(profile);
        } catch (err) {
          console.error("Erreur chargement profil:", err);
          setUser(null);
        }
      } else {
        setUser(null);
        setUserOrders([]);
        setAllOrders([]);
        setAllCustomers([]);
        setNewsletterSubscribers([]);
      }
      setLoading(false);
    });

    return () => unsubAuth();
  }, []);

  // ── Écouter les commandes de l'utilisateur courant ──
  useEffect(() => {
    if (!user || user.role === "admin") {
      return;
    }

    const q = query(
      collection(db, "orders"),
      where("userId", "==", user.id),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(q, (snap) => {
      const orders = snap.docs.map((d) => docToOrder(d.id, d.data()));
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

  // ── Auth Functions ──

  const loginWithEmail = useCallback(async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  }, []);

  const signUpWithEmail = useCallback(async (email: string, password: string, name: string, subscribeNewsletter = false) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    // Créer le profil Firestore. Toujours "customer" — l'admin est promu manuellement.
    await setDoc(doc(db, "users", cred.user.uid), {
      name,
      email,
      role: "customer",
      ordersCount: 0,
      createdAt: serverTimestamp(),
      subscribeNewsletter,
    });

    // Si coché, ajouter aussi à la collection newsletter
    if (subscribeNewsletter) {
      await addDoc(collection(db, "newsletter"), {
        email: email.trim().toLowerCase(),
        createdAt: serverTimestamp(),
        source: "inscription",
      });
    }
  }, []);

  const loginWithGoogle = useCallback(async () => {
    await signInWithPopup(auth, googleProvider);
    // Le profil sera créé par ensureUserProfile dans onAuthStateChanged
  }, []);

  const logoutFn = useCallback(async () => {
    await signOut(auth);
    setUser(null);
    setUserOrders([]);
    setAllOrders([]);
    setAllCustomers([]);
    setNewsletterSubscribers([]);
  }, []);

  // ── Order Functions ──

  const placeOrder = useCallback(async (items: OrderItem[], total: number) => {
    if (!user) throw new Error("Non connecté");

    await addDoc(collection(db, "orders"), {
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      items,
      total,
      status: "En attente" as OrderStatus,
      createdAt: serverTimestamp(),
    });
  }, [user]);

  const updateOrderStatus = useCallback(async (orderId: string, newStatus: OrderStatus) => {
    const orderRef = doc(db, "orders", orderId);

    await updateDoc(orderRef, {
      status: newStatus,
      updatedAt: serverTimestamp(),
    });

    // Quand une commande est marquée "Livré", incrémenter le compteur de fidélité du client
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
      }
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        loginWithEmail,
        signUpWithEmail,
        loginWithGoogle,
        logout: logoutFn,
        userOrders,
        allOrders,
        allCustomers,
        newsletterSubscribers,
        placeOrder,
        updateOrderStatus,
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
