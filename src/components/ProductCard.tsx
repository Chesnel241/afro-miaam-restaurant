"use client";

import Image from "next/image";
import { useState, useMemo } from "react";
import type { MenuItem } from "@/lib/types";
import { useCart } from "./CartContext";
import { formatPrice, getProductImage } from "@/lib/utils";
import { CheckIcon, PlusIcon } from "./Icons";

// Accept both the static MenuItem (slug-based catalog) and the dynamic
// shape coming from Firestore (auto-generated id, string category).
type DisplayableMenuItem = Omit<MenuItem, "category"> & { category: string };

export function ProductCard({ item }: { item: DisplayableMenuItem }) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);
  const [selectedFlavor, setSelectedFlavor] = useState<string>("");

  const hasFlavors = item.flavors && item.flavors.length > 0;
  
  const currentFlavor = useMemo(() => {
    if (!hasFlavors || !selectedFlavor) return null;
    return item.flavors?.find(f => f.name === selectedFlavor);
  }, [hasFlavors, selectedFlavor, item.flavors]);

  const currentPrice = item.price + (currentFlavor?.supplement || 0);

  function handleAdd() {
    addItem({
      id: item.id,
      name: item.name,
      price: item.price,
      image: getProductImage(item),
      flavor: selectedFlavor || undefined,
      flavorSupplement: currentFlavor?.supplement || 0
    });
    
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1400);
  }

  const isAvailable = item.available !== false;

  return (
    <article className={`group flex flex-col rounded-2xl bg-white p-4 shadow-card transition hover:shadow-soft ${!isAvailable ? 'opacity-60 grayscale-[0.5]' : ''}`}>
      <div className="relative aspect-[5/4] w-full overflow-hidden rounded-xl bg-creamSoft">
        <Image
          src={getProductImage(item)}
          alt={item.name}
          fill
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
        {!isAvailable && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[2px]">
            <span className="rounded-full bg-accent px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-white shadow-lg">
              Épuisé, bientôt de retour !
            </span>
          </div>
        )}
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
        <p className="text-sm text-primary/65 line-clamp-2">{item.description}</p>
        
        {/* Preference indicators on client card */}
        {(item as any).preferences && (item as any).preferences.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {(item as any).preferences.map((p: string) => {
              let label = "";
              let style = "";
              if (p === "veg") { label = "🥬 Veg"; style = "bg-emerald-50 text-emerald-700 border-emerald-200"; }
              else if (p === "spicy") { label = "🌶️ Épicé"; style = "bg-red-50 text-red-700 border-red-200"; }
              else if (p === "halal") { label = "🌙 Halal"; style = "bg-amber-50 text-amber-700 border-amber-200"; }
              else if (p === "nutfree") { label = "🥜 Sans arachide"; style = "bg-indigo-50 text-indigo-700 border-indigo-200"; }
              else if (p === "glutenfree") { label = "🌾 Sans gluten"; style = "bg-sky-50 text-sky-700 border-sky-200"; }
              
              if (!label) return null;
              return (
                <span key={p} className={`text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border ${style}`}>
                  {label}
                </span>
              );
            })}
          </div>
        )}

        {/* Sélecteur de saveurs */}
        {hasFlavors && isAvailable && (
          <div className="mt-2 space-y-2 animate-fade-in">
            <label className="text-[10px] font-black uppercase tracking-widest text-primary/40">Choisir une saveur :</label>
            <select 
              value={selectedFlavor}
              onChange={(e) => setSelectedFlavor(e.target.value)}
              className="w-full rounded-lg border border-cream/30 bg-creamSoft/30 px-3 py-2 text-xs font-bold text-primary outline-none focus:border-accent transition-colors"
            >
              <option value="">Standard</option>
              {item.flavors?.map((f) => (
                <option key={f.name} value={f.name}>
                  {f.name} {f.supplement > 0 ? `(+${f.supplement.toFixed(2)}€)` : '(+0€)'}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="mt-auto flex items-center justify-between pt-3 border-t border-cream/10">
          <div className="flex flex-col">
            <span className="font-display text-xl font-extrabold text-primary">
              {formatPrice(currentPrice)}
            </span>
            {currentFlavor && currentFlavor.supplement > 0 && (
              <span className="text-[10px] font-bold text-accent">Dont {formatPrice(currentFlavor.supplement)} de supplément</span>
            )}
          </div>
          <button
            type="button"
            onClick={handleAdd}
            disabled={!isAvailable}
            aria-label={isAvailable ? `Ajouter ${item.name} au panier` : `${item.name} est épuisé`}
            className={`inline-flex h-11 w-11 items-center justify-center rounded-full text-white transition shadow-md focus-ring ${
              !isAvailable ? "bg-primary/20 cursor-not-allowed" : added ? "bg-primary" : "bg-accent hover:scale-110 active:scale-95"
            }`}
          >
            {added ? <CheckIcon className="h-6 w-6" /> : <PlusIcon className="h-6 w-6" />}
          </button>
        </div>
      </div>
    </article>
  );
}
