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

  const isFormule = item.category === "formule";
  const isDecouverte = item.id.includes("decouverte");
  const isGourmand = item.id.includes("gourmand");

  const [entree, setEntree] = useState("");
  const [plat, setPlat] = useState("");
  const [acc, setAcc] = useState("");
  const [dessert, setDessert] = useState("");
  const [boisson, setBoisson] = useState("");

  const [isOpen, setIsOpen] = useState(false);

  const entreeOptions = isDecouverte
    ? ["Samoussa boeuf", "Samoussa thon"]
    : ["Pastels", "Samoussa au choix"];
  const platOptions = isDecouverte
    ? ["Mafé poulet", "Poulet Yassa", "Haricot / Beignets"]
    : ["Tièp poisson", "Poulet Mayo", "Mafé boeuf", "Odika poulet"];
  const accOptions = isDecouverte
    ? ["Riz parfumé", "Attiéké", "Banane vapeur"]
    : ["Frites de patates douces", "Manioc", "Attiéké"];
  const dessertOptions = ["Fondant chocolat", "Dégué", "Tiramisu"];
  const boissonOptions = isDecouverte
    ? ["Bissap", "Jus de gingembre", "Eau"]
    : ["Bissap", "Jus gingembre", "Boisson detox"];

  function handleFormuleAction() {
    if (typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches) {
      handleAdd();
    } else {
      setIsOpen(true);
    }
  }

  const hasFlavors = item.flavors && item.flavors.length > 0;
  
  const currentFlavor = useMemo(() => {
    if (!hasFlavors || !selectedFlavor) return null;
    return item.flavors?.find(f => f.name === selectedFlavor);
  }, [hasFlavors, selectedFlavor, item.flavors]);

  const currentPrice = item.price + (currentFlavor?.supplement || 0);

  function handleAdd() {
    if (isFormule) {
      if (!entree || !plat || !acc || !boisson || (isGourmand && !dessert)) {
        alert("Veuillez sélectionner toutes les options pour composer votre formule !");
        return;
      }
    }

    const composedFlavor = isFormule
      ? "Entrée: " + entree + " | Plat: " + plat + " | Accompagnement: " + acc + (isGourmand ? " | Dessert: " + dessert : "") + (boisson ? " | Boisson: " + boisson : "")
      : selectedFlavor || undefined;

    addItem({
      id: item.id,
      name: item.name,
      price: item.price,
      image: getProductImage(item),
      flavor: composedFlavor,
      flavorSupplement: currentFlavor?.supplement || 0
    });
    
    setAdded(true);
    setIsOpen(false);
    window.setTimeout(() => setAdded(false), 1400);
  }

  const isAvailable = item.available !== false;

  return (
    <>
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
          {item.allergensList && item.allergensList.length > 0 ? (
            <div className="flex flex-wrap gap-1 mt-1">
              {item.allergensList.map((a: any) => {
                let style = "bg-creamSoft text-primary border-cream/20";
                if (a.id === "veg") style = "bg-emerald-50 text-emerald-700 border-emerald-200";
                else if (a.id === "spicy") style = "bg-red-50 text-red-700 border-red-200";
                else if (a.id === "halal") style = "bg-amber-50 text-amber-700 border-amber-200";
                else if (a.id === "nutfree") style = "bg-indigo-50 text-indigo-700 border-indigo-200";
                else if (a.id === "glutenfree") style = "bg-sky-50 text-sky-700 border-sky-200";
                
                const displayLabel = a.value ? `${a.emoji} ${a.name} (${a.value})` : `${a.emoji} ${a.name}`;
                return (
                  <span key={a.id} className={`text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border ${style}`}>
                    {displayLabel}
                  </span>
                );
              })}
            </div>
          ) : item.preferences && item.preferences.length > 0 ? (
            <div className="flex flex-wrap gap-1 mt-1">
              {item.preferences.map((p: string) => {
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
          ) : null}

          {/* Formule Action Guide (Mobile only — opens Bottom Sheet) */}
          {isFormule && isAvailable && (
            <button
              type="button"
              onClick={() => setIsOpen(true)}
              className="mt-3 w-full py-2.5 px-4 rounded-xl border-2 border-dashed border-accent/40 bg-accent/5 text-xs font-black uppercase tracking-wider text-accent transition hover:bg-accent/10 flex items-center justify-center gap-2 lg:hidden"
            >
              <span>🍲 Composer mon Menu</span>
              <span className="text-[10px] bg-accent text-white px-2 py-0.5 rounded-lg">Choix</span>
            </button>
          )}

          {/* Formule inline composer (Desktop only — keeps original layout) */}
          {isFormule && isAvailable && (
            <div className="mt-3 hidden lg:block space-y-2 animate-fade-in">
              <label className="text-[10px] font-black uppercase tracking-widest text-primary/70">
                Composez votre formule :
              </label>
              {[
                { value: entree, set: setEntree, label: "Entrée", options: entreeOptions },
                { value: plat, set: setPlat, label: "Plat", options: platOptions },
                { value: acc, set: setAcc, label: "Accompagnement", options: accOptions },
                ...(isGourmand
                  ? [{ value: dessert, set: setDessert, label: "Dessert", options: dessertOptions }]
                  : []),
                { value: boisson, set: setBoisson, label: "Boisson", options: boissonOptions },
              ].map(({ value, set, label, options }) => (
                <div key={label} className="flex items-center gap-2">
                  <Image
                    src="/logo-afromiaam.png"
                    alt=""
                    width={20}
                    height={20}
                    className="rounded-full ring-1 ring-cream/40 bg-white shrink-0"
                  />
                  <select
                    value={value}
                    onChange={(e) => set(e.target.value)}
                    className="w-full rounded-lg border border-cream/30 bg-creamSoft/30 px-3 py-2 text-xs font-bold text-primary outline-none focus:border-accent transition-colors"
                  >
                    <option value="">{label}</option>
                    {options.map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          )}

          {/* Sélecteur de saveurs */}
          {hasFlavors && isAvailable && (
            <div className="mt-2 space-y-2 animate-fade-in">
              <label className="text-[10px] font-black uppercase tracking-widest text-primary/70">Choisir une saveur :</label>
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
              onClick={isFormule ? handleFormuleAction : handleAdd}
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

      {/* --- PREMIUM BOTTOM SHEET DIALOG (mobile only) --- */}
      {isFormule && isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center lg:hidden">
          {/* Backdrop Blur Overlay */}
          <div
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-primaryDark/80 backdrop-blur-md transition-opacity animate-fade-in"
          />

          {/* Bottom Sheet Body */}
          <div className="relative z-50 flex flex-col w-full max-h-[88vh] bg-cream rounded-t-[2.5rem] shadow-2xl overflow-hidden animate-slide-up border border-cream/10">
            
            {/* Visual drag handle indicator at the top for premium mobile feel */}
            <div className="w-full flex justify-center py-3">
              <div className="w-12 h-1.5 rounded-full bg-primary/10" />
            </div>

            {/* Modal Header */}
            <div className="px-6 pb-4 border-b border-primary/5 flex items-start justify-between">
              <div>
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-accent">Formule Spéciale</span>
                <h3 className="font-display text-2xl font-black text-primary mt-1">{item.name}</h3>
                <p className="text-xs text-primary/60 mt-1">{item.description}</p>
              </div>
              <button 
                type="button"
                onClick={() => setIsOpen(false)}
                className="h-8 w-8 flex items-center justify-center rounded-full bg-primary/5 text-primary hover:bg-primary/10 transition"
              >
                ✕
              </button>
            </div>

            {/* Bottom Sheet Content (Scrollable choice list) */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6 text-left">
              
              {/* Entrée */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black uppercase tracking-wider text-primary/70">1. Choisissez votre Entrée</label>
                  {entree && <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">Prêt ✓</span>}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {(isDecouverte ? ["Samoussa boeuf", "Samoussa thon"] : ["Pastels", "Samoussa au choix"]).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setEntree(opt)}
                      className={`p-3 text-xs font-black uppercase tracking-wider rounded-2xl border text-center transition-all duration-300 ${
                        entree === opt 
                          ? "bg-primary text-white border-primary shadow-md scale-[1.02]" 
                          : "bg-white text-primary border-primary/10 hover:border-accentSoft"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Plat */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black uppercase tracking-wider text-primary/70">2. Choisissez votre Plat</label>
                  {plat && <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">Prêt ✓</span>}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {(isDecouverte ? ["Mafé poulet", "Poulet Yassa", "Haricot / Beignets"] : ["Tièp poisson", "Poulet Mayo", "Mafé boeuf", "Odika poulet"]).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setPlat(opt)}
                      className={`p-3 text-xs font-black uppercase tracking-wider rounded-2xl border text-center transition-all duration-300 ${
                        plat === opt 
                          ? "bg-primary text-white border-primary shadow-md scale-[1.02]" 
                          : "bg-white text-primary border-primary/10 hover:border-accentSoft"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Accompagnement */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black uppercase tracking-wider text-primary/70">3. Choisissez l&apos;Accompagnement</label>
                  {acc && <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">Prêt ✓</span>}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {(isDecouverte ? ["Riz parfumé", "Attiéké", "Banane vapeur"] : ["Frites de patates douces", "Manioc", "Attiéké"]).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setAcc(opt)}
                      className={`p-3 text-xs font-black uppercase tracking-wider rounded-2xl border text-center transition-all duration-300 ${
                        acc === opt 
                          ? "bg-primary text-white border-primary shadow-md scale-[1.02]" 
                          : "bg-white text-primary border-primary/10 hover:border-accentSoft"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dessert (Menu Gourmand) */}
              {isGourmand && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black uppercase tracking-wider text-primary/70">4. Choisissez votre Dessert</label>
                    {dessert && <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">Prêt ✓</span>}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {["Fondant chocolat", "Dégué", "Tiramisu"].map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setDessert(opt)}
                        className={`p-2.5 text-[10px] font-black uppercase tracking-wider rounded-xl border text-center transition-all duration-300 ${
                          dessert === opt 
                            ? "bg-primary text-white border-primary shadow-md scale-[1.02]" 
                            : "bg-white text-primary border-primary/10 hover:border-accentSoft"
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Boisson */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black uppercase tracking-wider text-primary/70">{isGourmand ? "5." : "4."} Choisissez votre Boisson</label>
                  {boisson && <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">Prêt ✓</span>}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {(isDecouverte ? ["Bissap", "Jus de gingembre", "Eau"] : ["Bissap", "Jus gingembre", "Boisson detox"]).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setBoisson(opt)}
                      className={`p-2.5 text-[10px] font-black uppercase tracking-wider rounded-xl border text-center transition-all duration-300 ${
                        boisson === opt 
                          ? "bg-primary text-white border-primary shadow-md scale-[1.02]" 
                          : "bg-white text-primary border-primary/10 hover:border-accentSoft"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

            </div>

            {/* Bottom Sheet Fixed Footer Action */}
            <div className="p-6 border-t border-primary/5 bg-white/90 backdrop-blur">
              <button
                type="button"
                onClick={handleAdd}
                className="w-full flex items-center justify-between rounded-2xl bg-accent bg-accent-gradient py-4 px-6 text-sm font-black uppercase tracking-widest text-white shadow-glow transition hover:scale-[1.02] active:scale-98"
              >
                <span>Ajouter la formule</span>
                <span className="font-extrabold text-base bg-white/10 px-3 py-1 rounded-xl">
                  {formatPrice(currentPrice)}
                </span>
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
