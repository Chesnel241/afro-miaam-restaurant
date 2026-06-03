"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { useAuth } from "./AuthContext";
import { docToOrder, type Order, type OrderItem, type OrderStatus } from "./order-logic";

// Re-export types + the pure mapper so existing import sites keep working.
export type { Order, OrderItem, OrderStatus } from "./order-logic";
export { docToOrder } from "./order-logic";

type OrderContextType = {
  userOrders: Order[];
  allOrders: Order[];
  placeOrder: (
    items: OrderItem[],
    total: number,
    discounts?: {
      referralCredits?: number;
      welcomeOffer?: boolean;
      referralCodeUsed?: string;
    },
  ) => Promise<void>;
  updateOrderStatus: (orderId: string, newStatus: OrderStatus) => Promise<void>;
  requestOrderDeletion: (orderId: string) => Promise<void>;
  confirmOrderDeletion: (orderId: string, approved: boolean) => Promise<void>;
  addOrderReview: (
    orderId: string,
    reaction: "bon" | "moyen" | "pas_bon",
  ) => Promise<void>;
};

const OrderContext = createContext<OrderContextType | undefined>(undefined);

const POLL_INTERVAL_MS = 15_000;

export function OrderProvider({ children }: { children: React.ReactNode }) {
  const { user, authFetch } = useAuth();
  const [userOrders, setUserOrders] = useState<Order[]>([]);
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const cancelledRef = useRef(false);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      if (!user) {
        setUserOrders([]);
        setAllOrders([]);
        return;
      }
      try {
        const res = await authFetch("/api/orders", { signal });
        if (!res.ok) return;
        const data = (await res.json()) as { ok: boolean; orders?: unknown[] };
        if (!data.ok || !Array.isArray(data.orders) || cancelledRef.current) return;

        const mapped = data.orders.map((raw) => {
          const r = raw as Record<string, unknown>;
          return docToOrder(String(r.id), r);
        });

        if (user.role === "admin") {
          setAllOrders(mapped);
        } else {
          setUserOrders(
            mapped.sort(
              (a, b) =>
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
            ),
          );
        }
      } catch (e) {
        if ((e as Error).name !== "AbortError") {
          console.warn("ORDERS_FETCH_FAILED", (e as Error).message);
        }
      }
    },
    [user, authFetch],
  );

  useEffect(() => {
    cancelledRef.current = false;
    if (!user) {
      setUserOrders([]);
      setAllOrders([]);
      return;
    }
    const ctrl = new AbortController();
    load(ctrl.signal);
    const id = setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, POLL_INTERVAL_MS);
    const onVis = () => {
      if (document.visibilityState === "visible") load();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelledRef.current = true;
      ctrl.abort();
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [user, load]);

  // placeOrder is now a no-op shim — order creation goes through the
  // server-authoritative POST /api/reservation flow (which validates,
  // prices, and creates the row atomically). Kept exported so any legacy
  // caller still type-checks; throws to surface the misuse loudly.
  const placeOrder = useCallback(async () => {
    throw new Error(
      "placeOrder est obsolète — utilisez /api/reservation pour créer une commande.",
    );
  }, []);

  const updateOrderStatus = useCallback(
    async (orderId: string, newStatus: OrderStatus) => {
      if (!user || user.role !== "admin") return;
      const res = await authFetch(
        `/api/admin/orders/${encodeURIComponent(orderId)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        },
      );
      if (!res.ok) {
        throw new Error("Mise à jour de la commande impossible.");
      }
      await load();
    },
    [user, authFetch, load],
  );

  const requestOrderDeletion = useCallback(
    async (orderId: string) => {
      if (!user || user.role !== "admin") return;
      const res = await authFetch(
        `/api/admin/orders/${encodeURIComponent(orderId)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ deletionRequested: true }),
        },
      );
      if (!res.ok) throw new Error("Action impossible.");
      await load();
    },
    [user, authFetch, load],
  );

  const confirmOrderDeletion = useCallback(
    async (orderId: string, approved: boolean) => {
      if (!user || user.role !== "admin") return;
      if (!approved) {
        const res = await authFetch(
          `/api/admin/orders/${encodeURIComponent(orderId)}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ deletionRequested: false }),
          },
        );
        if (!res.ok) throw new Error("Action impossible.");
        await load();
        return;
      }
      const res = await authFetch(
        `/api/admin/orders/${encodeURIComponent(orderId)}`,
        { method: "DELETE" },
      );
      if (!res.ok) throw new Error("Suppression impossible.");
      await load();
    },
    [user, authFetch, load],
  );

  const addOrderReview = useCallback(
    async (orderId: string, reaction: "bon" | "moyen" | "pas_bon") => {
      if (!user) return;
      const res = await authFetch("/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, reaction }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || "Erreur lors de la soumission de l'avis.");
      }
      await load();
    },
    [user, authFetch, load],
  );

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
    [
      userOrders,
      allOrders,
      placeOrder,
      updateOrderStatus,
      requestOrderDeletion,
      confirmOrderDeletion,
      addOrderReview,
    ],
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
