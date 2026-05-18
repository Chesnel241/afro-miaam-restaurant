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
  const { itemCount, total } = useCart();
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
                {items.map((item) => (
                  <ProductCard key={item.id} item={item} />
                ))}
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
