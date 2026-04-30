"use client";

import Image from "next/image";
import { useState } from "react";
import type { MenuItem } from "@/lib/types";
import { useCart } from "./CartContext";
import { formatPrice } from "@/lib/utils";
import { CheckIcon, PlusIcon } from "./Icons";

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
    <article className="group flex flex-col rounded-2xl bg-white p-4 shadow-card transition hover:shadow-soft">
      <div className="relative aspect-[5/4] w-full overflow-hidden rounded-xl bg-creamSoft">
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
              <span key={t} className="badge bg-white/95 text-primary">
                {t}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 px-1 pt-4">
        <h3 className="font-display text-lg font-bold text-primary">
          {item.name}
        </h3>
        <p className="text-sm text-primary/65">{item.description}</p>

        <div className="mt-auto flex items-center justify-between pt-3">
          <span className="font-display text-xl font-extrabold text-primary">
            {formatPrice(item.price)}
          </span>
          <button
            type="button"
            onClick={handleAdd}
            aria-label={`Ajouter ${item.name} au panier`}
            className={`inline-flex h-10 w-10 items-center justify-center rounded-full text-white transition focus-ring ${
              added ? "bg-primary" : "bg-accent hover:opacity-90"
            }`}
          >
            {added ? <CheckIcon className="h-5 w-5" /> : <PlusIcon className="h-5 w-5" />}
          </button>
        </div>
      </div>
    </article>
  );
}
