"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { CartLine, DeliveryMode } from "@/lib/types";
import { DELIVERY_FEE } from "@/lib/booking";

const STORAGE_KEY = "afro-miaam-cart-v1";

type CartState = {
  lines: CartLine[];
  deliveryMode: DeliveryMode;
};

type CartContextValue = CartState & {
  itemCount: number;
  subtotal: number;
  deliveryFee: number;
  total: number;
  addItem: (line: Omit<CartLine, "quantity">, qty?: number) => void;
  removeItem: (id: string) => void;
  setQuantity: (id: string, qty: number) => void;
  setDeliveryMode: (mode: DeliveryMode) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<CartState>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as CartState;
        if (parsed && Array.isArray(parsed.lines)) {
          return {
            lines: parsed.lines,
            deliveryMode: parsed.deliveryMode === "livraison" ? "livraison" : "retrait",
          };
        }
      }
    } catch {
      // ignore corrupted storage
    }
    return { lines: [], deliveryMode: "retrait" };
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore quota errors
    }
  }, [state]);

  const addItem: CartContextValue["addItem"] = useCallback((line, qty = 1) => {
    setState((prev) => {
      const existing = prev.lines.find((l) => l.id === line.id);
      const lines = existing
        ? prev.lines.map((l) =>
            l.id === line.id ? { ...l, quantity: l.quantity + qty } : l,
          )
        : [...prev.lines, { ...line, quantity: qty }];
      return { ...prev, lines };
    });
  }, []);

  const removeItem = useCallback((id: string) => {
    setState((prev) => ({ ...prev, lines: prev.lines.filter((l) => l.id !== id) }));
  }, []);

  const setQuantity = useCallback((id: string, qty: number) => {
    setState((prev) => {
      if (qty <= 0) {
        return { ...prev, lines: prev.lines.filter((l) => l.id !== id) };
      }
      return {
        ...prev,
        lines: prev.lines.map((l) => (l.id === id ? { ...l, quantity: qty } : l)),
      };
    });
  }, []);

  const setDeliveryMode = useCallback((mode: DeliveryMode) => {
    setState((prev) => ({ ...prev, deliveryMode: mode }));
  }, []);

  const clear = useCallback(() => {
    setState({ lines: [], deliveryMode: "retrait" });
  }, []);

  const value = useMemo<CartContextValue>(() => {
    const subtotal = state.lines.reduce((s, l) => s + l.price * l.quantity, 0);
    const itemCount = state.lines.reduce((s, l) => s + l.quantity, 0);
    const deliveryFee =
      state.deliveryMode === "livraison" && state.lines.length > 0 ? DELIVERY_FEE : 0;
    const total = subtotal + deliveryFee;
    return {
      ...state,
      itemCount,
      subtotal,
      deliveryFee,
      total,
      addItem,
      removeItem,
      setQuantity,
      setDeliveryMode,
      clear,
    };
  }, [state, addItem, removeItem, setQuantity, setDeliveryMode, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within <CartProvider>");
  return ctx;
}
