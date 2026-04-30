"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CategoryTabs, type CategoryFilter } from "@/components/CategoryTabs";
import { ProductCard } from "@/components/ProductCard";
import { useCart } from "@/components/CartContext";
import { CATEGORY_LABELS, CATEGORY_ORDER, menuItems } from "@/data/menu";
import { formatPrice } from "@/lib/utils";
import { CartIcon } from "@/components/Icons";

export default function MenuPage() {
  const [filter, setFilter] = useState<CategoryFilter>("all");
  const { itemCount, total } = useCart();

  const visible = useMemo(() => {
    if (filter === "all") return menuItems;
    return menuItems.filter((i) => i.category === filter);
  }, [filter]);

  const grouped = useMemo(() => {
    if (filter !== "all") {
      return [{ category: filter, items: visible }];
    }
    return CATEGORY_ORDER.map((category) => ({
      category,
      items: menuItems.filter((i) => i.category === category),
    })).filter((g) => g.items.length > 0);
  }, [filter, visible]);

  return (
    <>
      <section className="bg-primary-gradient bg-grain pb-10 pt-12 text-cream sm:pt-16">
        <div className="container-x">
          <p className="eyebrow text-accentSoft">Notre carte</p>
          <h1 className="heading-display mt-3 text-4xl sm:text-5xl lg:text-6xl">
            Notre menu
          </h1>
          <p className="mt-4 max-w-2xl text-cream/85">
            Des plats généreux, faits maison, inspirés des traditions
            africaines. Commande à l&apos;avance — paiement après validation
            par téléphone.
          </p>
        </div>
      </section>

      <section className="sticky top-20 z-30 border-b border-primary/10 bg-cream/95 py-3 backdrop-blur sm:top-24">
        <div className="container-x">
          <CategoryTabs active={filter} onChange={setFilter} />
        </div>
      </section>

      <section className="py-12 sm:py-16">
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
