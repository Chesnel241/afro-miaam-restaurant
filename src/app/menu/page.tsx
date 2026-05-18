"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CategoryTabs, type CategoryFilter } from "@/components/CategoryTabs";
import { ProductCard } from "@/components/ProductCard";
import { useCart } from "@/components/CartContext";
import { useAuth } from "@/components/AuthContext";
import { CATEGORY_LABELS, CATEGORY_ORDER } from "@/data/menu";
import { formatPrice } from "@/lib/utils";
import { CartIcon, GiftIcon } from "@/components/Icons";

export default function MenuPage() {
  const [filter, setFilter] = useState<CategoryFilter>("all");
  const [prefFilter, setPrefFilter] = useState<string[]>([]);
  const { itemCount, total } = useCart();

  const togglePref = (pref: string) => {
    setPrefFilter(prev => 
      prev.includes(pref) ? prev.filter(p => p !== pref) : [...prev, pref]
    );
  };

  const isVegetarian = (item: any) => {
    const vegetarianIds = [
      "frites-patates-douces", "banane-bouillie", "riz", "attieke", "beignets", "frites", "manioc",
      "pancakes", "tiramisu", "degue", "crepes", "fondant-chocolat", "gateau-banane", "gateau-farine",
      "boisson-detox", "bissap", "jus-orange-presse", "eau", "jus-gingembre", "feuilles-manioc"
    ];
    return vegetarianIds.includes(item.id);
  };

  const isSpicy = (item: any) => {
    const spicyIds = ["pastels", "odika-poulet", "jus-gingembre"];
    return spicyIds.includes(item.id) || item.description?.toLowerCase().includes("épicé") || item.description?.toLowerCase().includes("relevé");
  };

  const isNutFree = (item: any) => {
    return !item.id.includes("mafe");
  };

  const isGlutenFree = (item: any) => {
    const containGluten = ["samoussa-boeuf", "pastels", "samoussa-thon", "pancakes", "crepes", "fondant-chocolat", "gateau-banane", "gateau-farine"];
    return !containGluten.includes(item.id);
  };

  const matchesPrefs = (item: any) => {
    if (prefFilter.includes("veg") && !isVegetarian(item)) return false;
    if (prefFilter.includes("spicy") && !isSpicy(item)) return false;
    if (prefFilter.includes("nutfree") && !isNutFree(item)) return false;
    if (prefFilter.includes("glutenfree") && !isGlutenFree(item)) return false;
    return true;
  };
  const { dynamicMenu } = useAuth();

  // Remonter en haut du menu lors du changement de catégorie
  useEffect(() => {
    if (filter !== "all") {
      const menuSection = document.getElementById("menu-content");
      if (menuSection) {
        const offset = 120; // compensation pour le header sticky
        const bodyRect = document.body.getBoundingClientRect().top;
        const elementRect = menuSection.getBoundingClientRect().top;
        const elementPosition = elementRect - bodyRect;
        const offsetPosition = elementPosition - offset;

        window.scrollTo({
          top: offsetPosition,
          behavior: "smooth"
        });
      }
    }
  }, [filter]);

  // Utiliser le menu dynamique de Firestore
  const menuItems = useMemo(() => {
    return dynamicMenu;
  }, [dynamicMenu]);

  const visible = useMemo(() => {
    if (filter === "all") return menuItems;
    return menuItems.filter((i) => i.category === filter);
  }, [filter, menuItems]);

  const grouped = useMemo(() => {
    if (filter !== "all") {
      return [{ category: filter, items: visible }];
    }
    return CATEGORY_ORDER.map((category) => ({
      category,
      items: menuItems.filter((i) => i.category === category),
    })).filter((g) => g.items.length > 0);
  }, [filter, visible, menuItems]);

  return (
    <>
      <section className="bg-primary-gradient bg-grain pb-10 pt-12 text-cream sm:pt-16">
        <div className="container-x">
          <p className="eyebrow text-accentSoft">Notre carte</p>
          <h1 className="heading-display mt-3 text-3xl sm:text-4xl lg:text-6xl">
            Notre menu
          </h1>
          <p className="mt-4 max-w-2xl text-cream/85">
            Des plats généreux, faits maison, inspirés des traditions
            africaines. Commande à l&apos;avance, paiement après validation
            par téléphone.
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 animate-pulse">
              <div className="h-2 w-2 rounded-full bg-accent shadow-[0_0_8px_rgba(255,165,0,0.8)]" />
              <p className="text-sm font-black uppercase tracking-widest text-accent">
                Places limitées : <span className="text-white">Plus que 8 disponibles pour demain</span>
              </p>
            </div>
            <div className="flex items-center gap-3 bg-white/5 rounded-2xl p-4 border border-white/5">
              <div className="h-8 w-8 rounded-full bg-accent/20 flex items-center justify-center text-accent">
                <GiftIcon className="h-4 w-4" />
              </div>
              <p className="text-xs font-bold text-cream/70">
                Gagnez <span className="text-white">5€</span> par ami parrainé
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="sticky top-20 z-30 border-b border-primary/10 bg-cream/95 py-3 backdrop-blur sm:top-24">
        <div className="container-x">
          <CategoryTabs active={filter} onChange={setFilter} />
          
          {/* Preference Toggles */}
          <div className="mt-4 flex flex-wrap gap-2 items-center justify-center sm:justify-start">
            <span className="text-[10px] font-black uppercase tracking-widest text-primary/40 mr-2">Préférences :</span>
            <button
              onClick={() => togglePref("veg")}
              className={`btn btn-xs rounded-full px-3 py-1.5 border transition-all text-[10px] uppercase font-black tracking-wider flex items-center gap-1.5 ${
                prefFilter.includes("veg")
                  ? "bg-green-600 text-white border-green-600 shadow-glow"
                  : "bg-white text-primary/60 border-primary/10 hover:border-green-600/35 hover:text-green-600"
              }`}
            >
              🥬 Végétarien
            </button>
            <button
              onClick={() => togglePref("spicy")}
              className={`btn btn-xs rounded-full px-3 py-1.5 border transition-all text-[10px] uppercase font-black tracking-wider flex items-center gap-1.5 ${
                prefFilter.includes("spicy")
                  ? "bg-red-600 text-white border-red-600 shadow-glow"
                  : "bg-white text-primary/60 border-primary/10 hover:border-red-600/35 hover:text-red-600"
              }`}
            >
              🌶️ Épicé
            </button>
            <button
              onClick={() => togglePref("nutfree")}
              className={`btn btn-xs rounded-full px-3 py-1.5 border transition-all text-[10px] uppercase font-black tracking-wider flex items-center gap-1.5 ${
                prefFilter.includes("nutfree")
                  ? "bg-[#D9A752] text-white border-[#D9A752] shadow-glow"
                  : "bg-white text-primary/60 border-primary/10 hover:border-[#D9A752]/35 hover:text-[#D9A752]"
              }`}
            >
              🥜 Sans arachide
            </button>
            <button
              onClick={() => togglePref("glutenfree")}
              className={`btn btn-xs rounded-full px-3 py-1.5 border transition-all text-[10px] uppercase font-black tracking-wider flex items-center gap-1.5 ${
                prefFilter.includes("glutenfree")
                  ? "bg-blue-600 text-white border-blue-600 shadow-glow"
                  : "bg-white text-primary/60 border-primary/10 hover:border-blue-600/35 hover:text-blue-600"
              }`}
            >
              🌾 Sans gluten
            </button>
          </div>
        </div>
      </section>

      <section id="menu-content" className="py-12 sm:py-16">
        <div className="container-x space-y-14">
          {grouped.map(({ category, items }) => (
            <div key={category}>
              <div className="mb-6 flex items-end justify-between gap-4">
                <h2 className="heading-display text-3xl text-primary">
                  {CATEGORY_LABELS[category]}
                </h2>
                <span className="text-sm font-semibold text-primary/60">
                  {items.length} plat{items.length > 1 ? "s" : ""}
                </span>
              </div>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((item) => {
                  const active = matchesPrefs(item);
                  return (
                    <div 
                      key={item.id} 
                      className={`transition-all duration-500 relative ${
                        active ? "opacity-100 scale-100" : "opacity-30 blur-[1px] pointer-events-none scale-[0.98]"
                      }`}
                    >
                      <ProductCard item={item} />
                      {!active && (
                        <div className="absolute inset-0 z-10 flex items-center justify-center p-4">
                          <span className="bg-primary/90 backdrop-blur-sm text-cream text-[9px] font-black uppercase tracking-widest px-4 py-2 rounded-xl shadow-lg ring-1 ring-white/10">
                            Non compatible
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          {menuItems.length === 0 && (
            <div className="py-20 text-center">
              <p className="text-primary/60 italic">Le menu est en cours de mise à jour...</p>
            </div>
          )}
        </div>
      </section>

      {itemCount > 0 && (
        <div className="sticky bottom-3 z-30 px-3 pb-3 sm:hidden">
          <Link
            href="/panier"
            className="btn btn-lg btn-primary w-full justify-between shadow-glow"
          >
            <span className="inline-flex items-center gap-2">
              <CartIcon className="h-5 w-5" />
              {itemCount} article{itemCount > 1 ? "s" : ""}
            </span>
            <span>{formatPrice(total)}</span>
          </Link>
        </div>
      )}
    </>
  );
}
