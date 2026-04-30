"use client";

import Image from "next/image";
import { useState } from "react";
import type { MenuItem } from "@/lib/types";
import { useCart } from "./CartContext";
import { formatPrice } from "@/lib/utils";

export function ProductCard({ item }: { item: MenuItem }) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);

  function handleAdd() {
    addItem({
      id: item.id,
      name: item.name,
      price: item.price,
      image: item.image,
    });
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1400);
  }

  return (
    <article className="card-soft group flex flex-col overflow-hidden">
      <div className="relative aspect-[5/4] w-full overflow-hidden bg-afro-sand">
        <Image
          src={item.image}
          alt={item.name}
          fill
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
        {item.tags && item.tags.length > 0 && (
          <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
            {item.tags.map((t) => (
              <span key={t} className="badge bg-white/95 text-afro-green">
                {t}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-display text-lg font-bold text-afro-green">
            {item.name}
          </h3>
          <span className="font-display text-lg font-bold text-afro-orange whitespace-nowrap">
            {formatPrice(item.price)}
          </span>
        </div>
        <p className="text-sm text-afro-black/70">{item.description}</p>

        <button
          type="button"
          onClick={handleAdd}
          className="btn btn-md btn-primary mt-auto self-start focus-ring"
          aria-label={`Ajouter ${item.name} au panier`}
        >
          {added ? "Ajouté ✓" : "Ajouter au panier"}
        </button>
      </div>
    </article>
  );
}
