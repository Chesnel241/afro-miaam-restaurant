"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import { collection, doc, query, onSnapshot, addDoc, updateDoc, serverTimestamp, orderBy, limit, or, where, getDoc, getDocs, deleteDoc, increment } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useAuth, UserProfile } from "./AuthContext";
import { Timestamp } from "firebase/firestore";

export type OrderStatus = "Attente Acompte" | "Acompte Reçu" | "En attente" | "En cours" | "Livré";

export type OrderItem = {
  name: string;
  quantity: number;
  price: number;
  itemId?: string;
  image?: string;
  flavor?: string;
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
  deletionRequested?: boolean;
  customer?: {
    phone?: string;
    slot?: string;
    deliveryMode?: string;
  };
};

type OrderContextType = {
  userOrders: Order[];
  allOrders: Order[];
  placeOrder: (items: OrderItem[], total: number, discounts?: { referralCredits?: number, welcomeOffer?: boolean, referralCodeUsed?: string }) => Promise<void>;
  updateOrderStatus: (orderId: string, newStatus: OrderStatus) => Promise<void>;
  requestOrderDeletion: (orderId: string) => Promise<void>;
  confirmOrderDeletion: (orderId: string, approved: boolean) => Promise<void>;
  addOrderReview: (orderId: string, reaction: "bon" | "moyen" | "pas_bon") => Promise<void>;
};

const OrderContext = createContext<OrderContextType | undefined>(undefined);

export function docToOrder(id: string, data: Record<string, unknown>): Order {
  let dateStr = "";
  const createdAt = data.createdAt;

  if (createdAt && typeof (createdAt as Timestamp).toDate === "function") {
    dateStr = (createdAt as Timestamp).toDate().toISOString();
  } else if (createdAt instanceof Date) {
    dateStr = createdAt.toISOString();
  } else if (typeof createdAt === "string") {
    dateStr = createdAt;
  } else {
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
    review: data.review || null,
    deletionRequested: (data.deletionRequested as boolean) || false,
    customer: data.customer as { phone?: string; slot?: string; deliveryMode?: string; } | undefined,
  };
}

export function OrderProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [userOrders, setUserOrders] = useState<Order[]>([]);
  const [allOrders, setAllOrders] = useState<Order[]>([]);

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

    if (discounts?.referralCodeUsed) {
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("referralCode", "==", discounts.referralCodeUsed));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const parrainDoc = querySnapshot.docs[0];
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

    if (newStatus === "Livré" && user?.role === "admin") {
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

    const orderSnap = await getDoc(orderRef);
    if (orderSnap.exists()) {
      const orderData = orderSnap.data();
      const userId = orderData.userId as string;
      const wasDelivered = orderData.status === "Livré";

      await deleteDoc(orderRef);

      if (userId && wasDelivered) {
        await updateDoc(doc(db, "users", userId), {
          ordersCount: increment(-1),
        });
      }
    }
  }, []);

  const addOrderReview = useCallback(async (orderId: string, reaction: "bon" | "moyen" | "pas_bon") => {
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

  const contextValue = useMemo(
    () => ({
      userOrders,
      allOrders,
      placeOrder,
      updateOrderStatus,
      requestOrderDeletion,
      confirmOrderDeletion,
      addOrderReview,
    }),
    [userOrders, allOrders, placeOrder, updateOrderStatus, requestOrderDeletion, confirmOrderDeletion, addOrderReview]
  );

  return (
    <OrderContext.Provider value={contextValue}>
      {children}
    </OrderContext.Provider>
  );
}

export function useOrders() {
  const context = useContext(OrderContext);
  if (context === undefined) {
    throw new Error("useOrders doit être utilisé à l'intérieur d'un OrderProvider");
  }
  return context;
}
