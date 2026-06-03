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
import { menuItems } from "@/data/menu";
import { useAuth } from "./AuthContext";

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

type MenuContextType = {
  dynamicMenu: MenuItemDynamic[];
  addMenuItem: (item: Omit<MenuItemDynamic, "id">) => Promise<void>;
  updateMenuItem: (id: string, item: Partial<MenuItemDynamic>) => Promise<void>;
  deleteMenuItem: (id: string) => Promise<void>;
  uploadImage: (file: File) => Promise<string>;
};

const MenuContext = createContext<MenuContextType | undefined>(undefined);

const POLL_INTERVAL_MS = 30_000;

// Static formulas that are always merged into the dynamic list (preserved
// from the previous Firestore-based implementation).
const STATIC_FORMULAS: MenuItemDynamic[] = [
  {
    id: "menu-decouverte",
    category: "formule",
    name: "Menu Découverte",
    description:
      "1 Entrée + 1 Plat + 1 Accompagnement + 1 Boisson au choix.",
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
    description:
      "1 Entrée + 1 Plat Premium + 1 Accompagnement Premium + 1 Dessert + 1 Boisson au choix.",
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
  },
];

function mergeFormulas(items: MenuItemDynamic[]): MenuItemDynamic[] {
  const out = [...items];
  for (const f of STATIC_FORMULAS) {
    if (!items.some((it) => it.id === f.id || it.name === f.name)) {
      out.push(f);
    }
  }
  return out;
}

export function MenuProvider({ children }: { children: React.ReactNode }) {
  const { user, authFetch } = useAuth();
  const [dynamicMenu, setDynamicMenu] = useState<MenuItemDynamic[]>(
    mergeFormulas(menuItems as unknown as MenuItemDynamic[]),
  );
  const cancelledRef = useRef(false);

  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      const res = await fetch("/api/menu", { signal });
      if (!res.ok) return;
      const data = (await res.json()) as { ok: boolean; items: MenuItemDynamic[] };
      if (data.ok && Array.isArray(data.items) && !cancelledRef.current) {
        setDynamicMenu(mergeFormulas(data.items));
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        console.warn("MENU_FETCH_FAILED", (e as Error).message);
      }
    }
  }, []);

  useEffect(() => {
    cancelledRef.current = false;
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
  }, [load]);

  const addMenuItem = useCallback(
    async (item: Omit<MenuItemDynamic, "id">) => {
      if (!user || user.role !== "admin") return;
      const res = await authFetch("/api/admin/menu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item),
      });
      if (!res.ok) throw new Error("Création impossible.");
      await load();
    },
    [user, authFetch, load],
  );

  const updateMenuItem = useCallback(
    async (id: string, patch: Partial<MenuItemDynamic>) => {
      if (!user || user.role !== "admin") return;
      const res = await authFetch(`/api/admin/menu/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error("Mise à jour impossible.");
      await load();
    },
    [user, authFetch, load],
  );

  const deleteMenuItem = useCallback(
    async (id: string) => {
      if (!user || user.role !== "admin") return;
      const res = await authFetch(`/api/admin/menu/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Suppression impossible.");
      await load();
    },
    [user, authFetch, load],
  );

  const uploadImage = useCallback(
    async (file: File): Promise<string> => {
      if (!user || user.role !== "admin") {
        throw new Error("Action non autorisée.");
      }
      const fd = new FormData();
      fd.append("file", file);
      const res = await authFetch("/api/admin/menu/upload", {
        method: "POST",
        body: fd,
      });
      if (!res.ok) throw new Error("Upload impossible.");
      const data = (await res.json()) as { url: string };
      return data.url;
    },
    [user, authFetch],
  );

  const contextValue = useMemo(
    () => ({
      dynamicMenu,
      addMenuItem,
      updateMenuItem,
      deleteMenuItem,
      uploadImage,
    }),
    [dynamicMenu, addMenuItem, updateMenuItem, deleteMenuItem, uploadImage],
  );

  return (
    <MenuContext.Provider value={contextValue}>{children}</MenuContext.Provider>
  );
}

export function useMenu() {
  const context = useContext(MenuContext);
  if (context === undefined) {
    throw new Error("useMenu doit être utilisé à l'intérieur d'un MenuProvider");
  }
  return context;
}
