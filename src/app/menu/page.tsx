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
import { ShimmerMenu } from "@/components/ShimmerMenu";

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
    if (item.preferences) return item.preferences.includes("veg");
    const vegetarianIds = [
      "frites-patates-douces", "banane-bouillie", "riz", "attieke", "beignets", "frites", "manioc",
      "pancakes", "tiramisu", "degue", "crepes", "fondant-chocolat", "gateau-banane", "gateau-farine",
      "boisson-detox", "bissap", "jus-orange-presse", "eau", "jus-gingembre", "feuilles-manioc"
    ];
    return vegetarianIds.includes(item.id);
  };

  const isSpicy = (item: any) => {
    if (item.preferences) return item.preferences.includes("spicy");
    const spicyIds = ["pastels", "odika-poulet", "jus-gingembre"];
    return spicyIds.includes(item.id) || item.description?.toLowerCase().includes("épicé") || item.description?.toLowerCase().includes("relevé");
  };

  const isHalal = (item: any) => {
    if (item.preferences) return item.preferences.includes("halal");
    return true;
  };

  const isNutFree = (item: any) => {
    if (item.preferences) return item.preferences.includes("nutfree");
    return !item.id.includes("mafe");
  };

  const isGlutenFree = (item: any) => {
    if (item.preferences) return item.preferences.includes("glutenfree");
    const containGluten = ["samoussa-boeuf", "pastels", "samoussa-thon", "pancakes", "crepes", "fondant-chocolat", "gateau-banane", "gateau-farine"];
    return !containGluten.includes(item.id);
  };

  const matchesPrefs = (item: any) => {
    if (prefFilter.includes("veg") && !isVegetarian(item)) return false;
    if (prefFilter.includes("spicy") && !isSpicy(item)) return false;
    if (prefFilter.includes("halal") && !isHalal(item)) return false;
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

      <section className="sticky top-12 z-30 border-b border-primary/10 bg-cream/95 py-2 backdrop-blur lg:top-20 lg:py-3">
        <div className="container-x">
          <CategoryTabs active={filter} onChange={setFilter} />
          
          {/* Preference Filter Bar — horizontal scroll on mobile */}
          <div className="mt-2 flex gap-2 items-center overflow-x-auto pt-2 border-t border-primary/5 pb-1 scrollbar-hide lg:mt-4 lg:flex-wrap lg:gap-2.5 lg:justify-start lg:pt-3 lg:overflow-visible">
            <span className="text-[9px] font-black uppercase tracking-[0.15em] text-primary/40 mr-1 flex items-center gap-1.5 shrink-0">
              <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
              Filtres :
            </span>
            {[
              { id: "veg", label: "🥬 Végétarien", activeBg: "bg-emerald-600/10 text-emerald-700 border-emerald-600/30", hoverBg: "hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-600/20" },
              { id: "spicy", label: "🌶️ Épicé", activeBg: "bg-red-600/10 text-red-700 border-red-600/30", hoverBg: "hover:bg-red-50 hover:text-red-700 hover:border-red-600/20" },
              { id: "halal", label: "🌙 Halal", activeBg: "bg-amber-600/10 text-amber-700 border-amber-600/30", hoverBg: "hover:bg-amber-50 hover:text-amber-700 hover:border-amber-600/20" },
              { id: "nutfree", label: "🥜 Sans Arachide", activeBg: "bg-indigo-600/10 text-indigo-700 border-indigo-600/30", hoverBg: "hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-600/20" },
              { id: "glutenfree", label: "🌾 Sans Gluten", activeBg: "bg-sky-600/10 text-sky-700 border-sky-600/30", hoverBg: "hover:bg-sky-50 hover:text-sky-700 hover:border-sky-600/20" }
            ].map((pref) => {
              const isActive = prefFilter.includes(pref.id);
              return (
                <button
                  key={pref.id}
                  onClick={() => togglePref(pref.id)}
                  className={`shrink-0 px-3 py-1.5 rounded-xl border text-[10px] uppercase font-black tracking-widest transition-all duration-300 flex items-center gap-1.5 shadow-sm lg:px-3.5 lg:py-2 ${
                    isActive ? pref.activeBg + " scale-[1.02] ring-2 ring-offset-1 ring-primary/5" : "bg-white/60 text-primary/50 border-primary/5 " + pref.hoverBg
                  }`}
                >
                  {pref.label}
                </button>
              );
            })}
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
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
          {menuItems.length === 0 && <ShimmerMenu />}
        </div>
      </section>
    </>
  );
}
