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
export type UserRole = "customer" | "admin" | "deleted";
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
  phone?: string;
  role: UserRole;
  ordersCount: number;
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
  // Actions
  placeOrder: (items: OrderItem[], total: number) => Promise<void>;
  updateOrderStatus: (orderId: string, newStatus: OrderStatus) => Promise<void>;
  // Menu Actions
  addMenuItem: (item: Omit<MenuItemDynamic, "id">) => Promise<void>;
  updateMenuItem: (id: string, item: Partial<MenuItemDynamic>) => Promise<void>;
  deleteMenuItem: (id: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ─── Helpers ────────────────────────────────────────────────

async function createInitialProfile(uid: string, email: string, displayName?: string | null): Promise<UserProfile> {
  const name = displayName || email.split("@")[0];
  const userRef = doc(db, "users", uid);
  
  const profile = {
    name,
    email,
    phone: "",
    role: "customer" as UserRole,
    ordersCount: 0,
    createdAt: serverTimestamp(),
  };

  await setDoc(userRef, profile);
  return { id: uid, ...profile };
}

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
    await setDoc(doc(db, "users", cred.user.uid), {
      name,
      email,
      phone,
      role: "customer",
      ordersCount: 0,
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
    await updateDoc(doc(db, "users", uid), {
      deletedAt: serverTimestamp(),
      role: "deleted",
    });
    await signOut(auth);
    setUser(null);
  }, [user]);

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
        updateOrderStatus,
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
