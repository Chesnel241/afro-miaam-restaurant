"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import { collection, doc, query, onSnapshot, addDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
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
};

const MenuContext = createContext<MenuContextType | undefined>(undefined);

export function MenuProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [dynamicMenu, setDynamicMenu] = useState<MenuItemDynamic[]>(menuItems as unknown as MenuItemDynamic[]);

  useEffect(() => {
    const q = query(collection(db, "menu"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const items = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<MenuItemDynamic, "id">),
        }));

        const formulas: MenuItemDynamic[] = [
          {
            id: "menu-decouverte",
            category: "formule",
            name: "Menu Découverte",
            description: "1 Entrée + 1 Plat + 1 Accompagnement + 1 Boisson au choix.",
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
            description: "1 Entrée + 1 Plat Premium + 1 Accompagnement Premium + 1 Dessert + 1 Boisson au choix.",
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
          }
        ];

        const finalItems = [...items];
        formulas.forEach(f => {
          if (!items.some(it => it.id === f.id || it.name === f.name)) {
            finalItems.push(f);
          }
        });

        setDynamicMenu(finalItems);
      },
      (err) => {
        console.warn("MENU_SNAPSHOT_ERROR", err.message);
        setDynamicMenu(menuItems as unknown as MenuItemDynamic[]);
      }
    );
    return () => unsub();
  }, []);

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

  const contextValue = useMemo(
    () => ({
      dynamicMenu,
      addMenuItem,
      updateMenuItem,
      deleteMenuItem,
    }),
    [dynamicMenu, addMenuItem, updateMenuItem, deleteMenuItem]
  );

  return (
    <MenuContext.Provider value={contextValue}>
      {children}
    </MenuContext.Provider>
  );
}

export function useMenu() {
  const context = useContext(MenuContext);
  if (context === undefined) {
    throw new Error("useMenu doit être utilisé à l'intérieur d'un MenuProvider");
  }
  return context;
}
