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
import { sanitizeStoredLines } from "./cart-logic";

// Re-export for any existing import sites of the legacy location.
export { sanitizeStoredLines } from "./cart-logic";

const STORAGE_KEY = "afro-miaam-cart-v2";

type CartState = {
  lines: CartLine[];
  deliveryMode: DeliveryMode;
};

type AddItemInput = {
  id: string;        // id du plat d'origine
  name: string;
  price: number;     // prix de base
  image: string;
  flavor?: string;   // nom de la saveur (optionnel)
  flavorSupplement?: number; // supplément prix saveur
};

type CartContextValue = CartState & {
  itemCount: number;
  subtotal: number;
  deliveryFee: number;
  total: number;
  cart: CartLine[];
  addItem: (item: AddItemInput, qty?: number) => void;
  removeItem: (id: string) => void;
  setQuantity: (id: string, qty: number) => void;
  setDeliveryMode: (mode: DeliveryMode) => void;
  clear: () => void;
  clearCart: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<CartState>(() => {
    try {
      if (typeof window === "undefined") return { lines: [], deliveryMode: "retrait" };
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { lines: [], deliveryMode: "retrait" };
      const parsed = JSON.parse(raw) as { lines?: unknown; deliveryMode?: unknown };
      return {
        lines: sanitizeStoredLines(parsed.lines),
        deliveryMode: parsed.deliveryMode === "livraison" ? "livraison" : "retrait",
      };
    } catch {
      return { lines: [], deliveryMode: "retrait" };
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore quota errors
    }
  }, [state]);

  const addItem: CartContextValue["addItem"] = useCallback((item, qty = 1) => {
    setState((prev) => {
      // Clé unique : combine l'id du plat + la saveur pour permettre le même plat avec différentes saveurs
      const cartId = item.flavor ? `${item.id}__${item.flavor}` : item.id;
      const finalPrice = item.price + (item.flavorSupplement || 0);
      
      const existing = prev.lines.find((l) => l.id === cartId);
      const lines = existing
        ? prev.lines.map((l) =>
            l.id === cartId ? { ...l, quantity: l.quantity + qty } : l,
          )
        : [...prev.lines, {
            id: cartId,
            itemId: item.id,
            name: item.name,
            price: finalPrice,
            image: item.image,
            quantity: qty,
            flavor: item.flavor,
          }];
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
      cart: state.lines,
      itemCount,
      subtotal,
      deliveryFee,
      total,
      addItem,
      removeItem,
      setQuantity,
      setDeliveryMode,
      clear,
      clearCart: clear,
    };
  }, [state, addItem, removeItem, setQuantity, setDeliveryMode, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within <CartProvider>");
  return ctx;
}
