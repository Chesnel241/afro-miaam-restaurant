"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import { collection, doc, query, onSnapshot, addDoc, updateDoc, serverTimestamp, orderBy, limit, or, where, getDoc, getDocs, deleteDoc, increment, runTransaction } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useAuth, UserProfile } from "./AuthContext";
import { Timestamp } from "firebase/firestore";
import { docToOrder, type Order, type OrderItem, type OrderStatus } from "./order-logic";

// Re-export types + the pure mapper so existing import sites keep working.
export type { Order, OrderItem, OrderStatus } from "./order-logic";
export { docToOrder } from "./order-logic";

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

        // Vague2-E/H (restored): gate the +5€ referrer reward on
        //   - referrerId !== userId  (defense-in-depth against self-referral
        //     even if a future code path managed to mint referrerId === buyer)
        //   - order.referralRewardPaid !== true  (idempotency — no double pay
        //     on accidental status flips, retries, or two admins clicking)
        // The credit + idempotency flag flip happen in the SAME transaction.
        if (referrerId && referrerId !== userId) {
          try {
            await runTransaction(db, async (tx) => {
              const fresh = await tx.get(orderRef);
              if (!fresh.exists()) return;
              const data = fresh.data();
              if (
                data.status === "Livré" &&
                data.referrerId &&
                data.referrerId !== data.userId &&
                data.referralRewardPaid !== true
              ) {
                tx.update(doc(db, "users", referrerId), {
                  referralCredits: increment(5),
                });
                tx.update(orderRef, { referralRewardPaid: true });
              }
            });
          } catch (err) {
            // Non-fatal: status transition already succeeded; reward is
            // retry-safe via idempotency the next time the admin opens the
            // order, so we don't block the UI.
            console.warn("REFERRAL_REWARD_TX_FAILED", (err as { code?: string }).code ?? "unknown");
          }
        }
      }
    }
  }, [user]);

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
