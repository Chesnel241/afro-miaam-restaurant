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

export function sanitizeStoredLines(raw: unknown): CartLine[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const safe: CartLine[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const e = entry as Record<string, unknown>;
    const id = typeof e.id === "string" ? e.id.slice(0, 80) : "";
    const itemId = typeof e.itemId === "string" ? e.itemId.slice(0, 80) : id;
    const name = typeof e.name === "string" ? e.name.slice(0, 120) : "";
    const price = typeof e.price === "number" && Number.isFinite(e.price) && e.price >= 0 ? e.price : 0;
    const image = typeof e.image === "string" ? e.image.slice(0, 500) : "";
    const quantity = typeof e.quantity === "number" && Number.isInteger(e.quantity) ? Math.min(50, Math.max(1, e.quantity)) : 1;
    const flavor = typeof e.flavor === "string" ? e.flavor.slice(0, 200) : undefined;
    if (!id || !name || seen.has(id)) continue;
    seen.add(id);
    safe.push({ id, itemId, name, price, image, quantity, flavor });
  }
  return safe.slice(0, 50);
}

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
