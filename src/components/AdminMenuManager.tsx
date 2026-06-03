"use client";

import { useState, useRef } from "react";
import { useMenu, type MenuItemDynamic, type Flavor } from "@/components/MenuContext";
import { TrashIcon, PlusIcon } from "@/components/Icons";
import { CATEGORY_LABELS, CATEGORY_ORDER, menuItems } from "@/data/menu";

// Default diet/allergen preferences applied when (re)seeding the carte from
// the static menu data. Mirrors the prior seed logic so the restored menu
// keeps the same badges (Halal, Sans arachide, Sans gluten...).
function getInitialPreferences(item: { id: string }): string[] {
  const prefs: string[] = [];
  const vegetarianIds = [
    "frites-patates-douces", "banane-bouillie", "riz", "attieke", "beignets", "frites", "manioc",
    "pancakes", "tiramisu", "degue", "crepes", "fondant-chocolat", "gateau-banane", "gateau-farine",
    "boisson-detox", "bissap", "jus-orange-presse", "eau", "jus-gingembre", "feuilles-manioc",
  ];
  if (vegetarianIds.includes(item.id)) prefs.push("veg");

  const spicyIds = ["pastels", "odika-poulet", "jus-gingembre"];
  if (spicyIds.includes(item.id)) prefs.push("spicy");

  // Default fallback is halal for all Afro Miaam dishes
  prefs.push("halal");

  if (!item.id.includes("mafe")) prefs.push("nutfree");

  const containGluten = ["samoussa-boeuf", "pastels", "samoussa-thon", "pancakes", "crepes", "fondant-chocolat", "gateau-banane", "gateau-farine"];
  if (!containGluten.includes(item.id)) prefs.push("glutenfree");

  return prefs;
}


// Form-local type: price and flavor.supplement are strings while typing,
// then coerced to numbers at submission.
type FlavorDraft = {
  name: string;
  supplement: string;
};

type AllergenItem = {
  id: string;
  name: string;
  emoji: string;
  value: string;
};

type MenuFormState = {
  name: string;
  description: string;
  price: string;
  image: string;
  category: string;
  tags: string[];
  available: boolean;
  flavors: FlavorDraft[];
  preferences: string[];
  allergensList: AllergenItem[];
};

const EMPTY_FORM: MenuFormState = {
  name: "",
  description: "",
  price: "0",
  image: "/img/signatures/mafe.jpg",
  category: "signature",
  tags: [],
  available: true,
  flavors: [],
  preferences: [],
  allergensList: [],
};

const PRESET_ALLERGENS = [
  { id: "veg", name: "Végétarien", emoji: "🥬", options: ["Végétarien", "100% Végan", "Lacto-végétarien"] },
  { id: "spicy", name: "Épicé", emoji: "🌶️", options: ["Doux", "Moyen", "Piquant", "Très Piquant (Volcan)"] },
  { id: "halal", name: "Halal", emoji: "🌙", options: ["Certifié Halal", "Viande Halal"] },
  { id: "nutfree", name: "Sans arachide", emoji: "🥜", options: ["100% Garanti", "Sans arachide", "Traces éventuelles"] },
  { id: "glutenfree", name: "Sans gluten", emoji: "🌾", options: ["Sans gluten", "Traces possibles"] },
  { id: "lactose", name: "Sans lactose", emoji: "🥛", options: ["Sans lactose", "Traces de lait"] },
];

export function AdminMenuManager() {
  const { dynamicMenu, addMenuItem, updateMenuItem, deleteMenuItem, uploadImage } = useMenu();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [form, setForm] = useState<MenuFormState>(EMPTY_FORM);

  const handleEdit = (item: MenuItemDynamic) => {
    setEditingId(item.id);
    setForm({
      name: item.name,
      description: item.description,
      price: item.price.toString(),
      image: item.image,
      category: item.category,
      tags: item.tags || [],
      available: item.available,
      flavors: (item.flavors || []).map((f) => ({
        name: f.name,
        supplement: f.supplement.toString(),
      })),
      preferences: item.preferences || [],
      allergensList: item.allergensList || (item.preferences || []).map(p => {
        const preset = PRESET_ALLERGENS.find(pr => pr.id === p);
        return {
          id: p,
          name: preset ? preset.name : p,
          emoji: preset ? preset.emoji : "⚠️",
          value: ""
        };
      }),
    });
    setIsAdding(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancel = () => {
    setEditingId(null);
    setIsAdding(false);
    setForm(EMPTY_FORM);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.category) return;

    setIsSaving(true);
    try {
      const priceNum = parseFloat(form.price);
      const flavors: Flavor[] = form.flavors
        .filter((f) => f.name.trim() !== "")
        .map((f) => ({
          name: f.name,
          supplement: parseFloat(f.supplement) || 0,
        }));

      const payload: Omit<MenuItemDynamic, "id"> = {
        name: form.name,
        description: form.description,
        price: Number.isFinite(priceNum) ? priceNum : 0,
        image: form.image,
        category: form.category,
        tags: form.tags,
        available: form.available,
        ...(flavors.length > 0 ? { flavors } : {}),
        preferences: form.allergensList.map(a => a.id),
        allergensList: form.allergensList,
      };

      if (editingId) {
        await updateMenuItem(editingId, payload);
      } else {
        await addMenuItem(payload);
      }
      handleCancel();
    } catch (err: unknown) {
      const code =
        err && typeof err === "object" && "code" in err
          ? String((err as { code?: unknown }).code)
          : "unknown";
      console.error("SAVE_FAILED", code);
      alert("Erreur lors de l'enregistrement.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const url = await uploadImage(file);
      setForm((prev) => ({ ...prev, image: url }));
    } catch (err: unknown) {
      console.warn("UPLOAD_FAILED", err);
      alert("Upload indisponible, utilisez une URL externe.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSeed = async (force = false) => {
    const msg = force
      ? "Êtes-vous sûr ? Cela va EFFACER le menu actuel et restaurer tous les plats par défaut (Garba, Tièp, Mafé...)."
      : "Voulez-vous initialiser la carte avec les plats par défaut ?";

    if (confirm(msg)) {
      setIsSeeding(true);
      try {
        // Force = wipe the current carte before reseeding the default dishes.
        if (force) {
          for (const item of dynamicMenu) {
            await deleteMenuItem(item.id);
          }
        }
        // Recreate every default dish from the static carte data, applying the
        // historical diet/allergen badges (Halal, Sans arachide, Sans gluten...).
        for (const item of menuItems) {
          const prefs = getInitialPreferences(item);
          await addMenuItem({
            name: item.name,
            description: item.description,
            price: item.price,
            image: item.image,
            category: item.category,
            tags: item.tags || [],
            available: true,
            preferences: prefs,
            allergensList: prefs.map((p) => {
              const preset = PRESET_ALLERGENS.find((pr) => pr.id === p);
              return {
                id: p,
                name: preset ? preset.name : p,
                emoji: preset ? preset.emoji : "⚠️",
                value: preset ? preset.options[0] || "" : "",
              };
            }),
          });
        }
        alert("Menu rétabli avec succès ! Rafraîchissez la page si nécessaire.");
      } catch (err: unknown) {
        console.error("Seed error:", err);
        const errorMsg = err instanceof Error ? err.message : String(err);
        alert("Erreur lors de l'initialisation :\n" + errorMsg);
      } finally {
        setIsSeeding(false);
      }
    }
  };

  return (
    <div className="space-y-10 pb-20">
      {/* Header Actions */}
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between bg-white p-6 rounded-3xl shadow-soft ring-1 ring-cream/20">
        <div>
          <h2 className="heading-display text-2xl text-primary sm:text-3xl">Gestion de la Carte</h2>
          <p className="text-sm text-primary/50 mt-1 italic">
            {dynamicMenu.length} plat{dynamicMenu.length > 1 ? "s" : ""} en ligne.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => handleSeed(true)}
            disabled={isSeeding}
            className="btn btn-md bg-primary text-white px-6 shadow-md hover:bg-primaryDark transition-all"
          >
            {isSeeding
              ? "Opération..."
              : dynamicMenu.length === 0
              ? "Initialiser le menu"
              : "Rétablir le menu par défaut"}
          </button>

          {!isAdding && !editingId && (
            <button
              onClick={() => {
                setIsAdding(true);
                setForm(EMPTY_FORM);
              }}
              className="btn btn-md bg-accent text-white px-6 shadow-glow flex items-center gap-2"
            >
              <PlusIcon className="h-5 w-5" /> Ajouter un plat
            </button>
          )}
        </div>
      </div>

      {/* Formulaire Ajout / Edition */}
      {(isAdding || editingId) && (
        <div className="rounded-3xl bg-white p-8 shadow-card ring-1 ring-cream/20 animate-fade-in">
          <div className="flex items-center justify-between mb-8 border-b border-cream/20 pb-4">
            <h3 className="heading-display text-xl text-primary">
              {editingId ? "Modifier le plat" : "Ajouter un nouveau plat"}
            </h3>
            <button
              onClick={handleCancel}
              className="text-sm font-bold text-primary/40 hover:text-primary uppercase tracking-widest"
            >
              Fermer
            </button>
          </div>

          <form onSubmit={handleSubmit} className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-primary/60">
                Nom du plat
              </label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="field h-12"
                placeholder="Ex: Mafé au bœuf"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-primary/60">
                Prix (€)
              </label>
              <input
                type="text"
                inputMode="decimal"
                required
                value={form.price}
                onChange={(e) => {
                  const val = e.target.value.replace(",", ".");
                  if (val === "" || /^\d*\.?\d*$/.test(val)) {
                    setForm({ ...form, price: val });
                  }
                }}
                className="field h-12"
                placeholder="0.00"
              />
            </div>
            <div className="sm:col-span-2 space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-primary/60">
                Description courte
              </label>
              <textarea
                required
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="field py-3 min-h-[100px]"
                rows={3}
                placeholder="Décrivez les ingrédients principaux..."
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-primary/60">
                Catégorie
              </label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="field h-12 bg-white cursor-pointer"
              >
                {CATEGORY_ORDER.map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY_LABELS[c]}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-primary/60">
                Image du plat
              </label>

              {/* Preview Image */}
              {form.image && (
                <div className="mb-3 h-32 w-32 overflow-hidden rounded-2xl bg-cream shadow-inner border border-cream/30">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={form.image} alt="Preview" className="h-full w-full object-cover" />
                </div>
              )}

              <div className="flex gap-3">
                <input
                  type="text"
                  required
                  value={form.image}
                  onChange={(e) => setForm({ ...form, image: e.target.value })}
                  className="field h-12 flex-1"
                  placeholder="URL ou uploader →"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="btn btn-sm bg-creamSoft text-primary border border-cream/30 hover:bg-cream transition-colors min-w-[100px]"
                >
                  {isUploading ? "..." : "Uploader"}
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  className="hidden"
                  accept="image/*"
                />
              </div>
            </div>

            <div className="sm:col-span-2 space-y-4 pt-4 border-t border-cream/20">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black uppercase tracking-widest text-primary/60">
                  Saveurs / Options (Optionnel)
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setForm({
                      ...form,
                      flavors: [...form.flavors, { name: "", supplement: "0" }],
                    });
                  }}
                  className="text-[10px] font-black text-accent uppercase tracking-widest hover:underline"
                >
                  + Ajouter une saveur
                </button>
              </div>

              {form.flavors.length > 0 && (
                <div className="grid gap-3">
                  {form.flavors.map((f, i) => (
                    <div key={i} className="flex gap-3 items-center animate-fade-in">
                      <input
                        type="text"
                        placeholder="Nom (ex: Épicé, Vanille...)"
                        value={f.name}
                        onChange={(e) => {
                          const newFlavors = [...form.flavors];
                          newFlavors[i] = { ...newFlavors[i], name: e.target.value };
                          setForm({ ...form, flavors: newFlavors });
                        }}
                        className="field h-10 flex-1"
                      />
                      <div className="relative w-28">
                        <input
                          type="text"
                          inputMode="decimal"
                          placeholder="0.00"
                          value={f.supplement}
                          onChange={(e) => {
                            const val = e.target.value.replace(",", ".");
                            if (val === "" || /^\d*\.?\d*$/.test(val)) {
                              const newFlavors = [...form.flavors];
                              newFlavors[i] = { ...newFlavors[i], supplement: val };
                              setForm({ ...form, flavors: newFlavors });
                            }
                          }}
                          className="field h-10 w-full pl-7"
                        />
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-primary/40">
                          +
                        </span>
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-primary/40">
                          €
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const newFlavors = form.flavors.filter((_, idx) => idx !== i);
                          setForm({ ...form, flavors: newFlavors });
                        }}
                        className="p-2 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-all"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {form.flavors.length === 0 && (
                <p className="text-[10px] text-primary/30 italic">
                  Aucune saveur configurée pour ce plat.
                </p>
              )}
            </div>

            {/* Intelligent Allergen & Diet Customizer */}
            <div className="sm:col-span-2 space-y-4 pt-6 border-t border-cream/20 bg-creamSoft/20 p-6 rounded-3xl mt-4 animate-fade-in">
              <div>
                <h4 className="text-sm font-black uppercase tracking-widest text-primary">
                  🛡️ Centre de Gestion des Allergènes & Régimes
                </h4>
                <p className="text-xs text-primary/50 mt-1">
                  Activez des régimes alimentaires, des allergènes et personnalisez les niveaux (ex: niveau d&apos;épice doux, moyen...).
                </p>
              </div>

              {/* Presets Quick Toggles */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-primary/40">
                  Régimes & Allergènes Standards :
                </label>
                <div className="flex flex-wrap gap-2">
                  {PRESET_ALLERGENS.map((preset) => {
                    const isActive = form.allergensList.some(a => a.id === preset.id);
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => {
                          if (isActive) {
                            setForm({
                              ...form,
                              allergensList: form.allergensList.filter(a => a.id !== preset.id)
                            });
                          } else {
                            setForm({
                              ...form,
                              allergensList: [
                                ...form.allergensList,
                                { id: preset.id, name: preset.name, emoji: preset.emoji, value: preset.options[0] || "" }
                              ]
                            });
                          }
                        }}
                        className={"px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border shadow-sm " + (isActive ? 'bg-accent text-white border-accent' : 'bg-white text-primary/60 border-cream/20 hover:bg-cream')}
                      >
                        {preset.emoji} {preset.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Add Custom Allergen Form */}
              <div className="pt-2 border-t border-cream/10 space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-primary/40">
                  Créer un allergène ou régime personnalisé :
                </label>
                <div className="flex flex-wrap gap-2 items-center">
                  <input
                    id="custom-allergen-emoji"
                    type="text"
                    placeholder="Emoji"
                    className="field h-10 w-24 text-center"
                    maxLength={2}
                  />
                  <input
                    id="custom-allergen-name"
                    type="text"
                    placeholder="Nom (ex: Lactose, Crustacés)"
                    className="field h-10 flex-1 min-w-[200px]"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const emojiInput = document.getElementById("custom-allergen-emoji") as HTMLInputElement;
                      const nameInput = document.getElementById("custom-allergen-name") as HTMLInputElement;
                      const name = nameInput?.value.trim();
                      const emoji = emojiInput?.value.trim() || "⚠️";
                      if (name) {
                        const id = name.toLowerCase().replace(/[^a-z0-9]/g, "");
                        if (!form.allergensList.some(a => a.id === id)) {
                          setForm({
                            ...form,
                            allergensList: [...form.allergensList, { id, name, emoji, value: "" }]
                          });
                        }
                        nameInput.value = "";
                        emojiInput.value = "";
                      }
                    }}
                    className="btn btn-sm bg-primary text-white h-10 px-4"
                  >
                    + Ajouter
                  </button>
                </div>
              </div>

              {/* Active Allergens Configuration List */}
              {form.allergensList.length > 0 && (
                <div className="pt-4 border-t border-cream/10 space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-primary/40">
                    Configuration des options & niveaux actifs :
                  </label>
                  <div className="grid gap-3">
                    {form.allergensList.map((allergen, index) => {
                      const preset = PRESET_ALLERGENS.find(pr => pr.id === allergen.id);
                      return (
                        <div key={allergen.id} className="flex flex-wrap gap-2 items-center bg-white p-3 rounded-2xl shadow-sm border border-cream/10 animate-fade-in">
                          <span className="text-sm font-bold text-primary flex items-center gap-1.5 min-w-[150px]">
                            <span>{allergen.emoji}</span>
                            <span>{allergen.name}</span>
                          </span>

                          {/* Level/Option input or dropdown */}
                          <div className="flex-1 min-w-[200px]">
                            {preset ? (
                              <select
                                value={allergen.value}
                                onChange={(e) => {
                                  const updated = [...form.allergensList];
                                  updated[index].value = e.target.value;
                                  setForm({ ...form, allergensList: updated });
                                }}
                                className="field h-9 py-0 text-xs w-full bg-creamSoft/30"
                              >
                                {preset.options.map(opt => (
                                  <option key={opt} value={opt}>{opt}</option>
                                ))}
                                <option value="CUSTOM">Option personnalisée...</option>
                              </select>
                            ) : null}

                            {(!preset || allergen.value === "CUSTOM" || !preset.options.includes(allergen.value)) && (
                              <input
                                type="text"
                                placeholder="Détail (ex: Doux, Traces possibles, 100% garanti...)"
                                value={allergen.value === "CUSTOM" ? "" : allergen.value}
                                onChange={(e) => {
                                  const updated = [...form.allergensList];
                                  updated[index].value = e.target.value;
                                  setForm({ ...form, allergensList: updated });
                                }}
                                className="field h-9 text-xs w-full mt-1.5"
                              />
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              setForm({
                                ...form,
                                allergensList: form.allergensList.filter(a => a.id !== allergen.id)
                              });
                            }}
                            className="p-2 rounded-xl text-red-400 hover:text-red-600 hover:bg-red-50 transition-all ml-auto"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="sm:col-span-2 flex items-center justify-end gap-4 mt-4 pt-6 border-t border-cream/20">
              <button
                type="button"
                onClick={handleCancel}
                className="btn btn-md bg-transparent text-primary/60 hover:text-primary"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="btn btn-md bg-primary text-white px-12 shadow-lg"
              >
                {isSaving ? "Enregistrement..." : "Enregistrer le plat"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Liste des plats */}
      <div className="overflow-hidden rounded-3xl bg-white shadow-card ring-1 ring-cream/20">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead className="bg-creamSoft/50 text-primary text-[10px] font-black uppercase tracking-[0.2em]">
              <tr>
                <th className="px-8 py-5">Plat</th>
                <th className="px-8 py-5">Catégorie</th>
                <th className="px-8 py-5">Prix</th>
                <th className="px-8 py-5">Disponibilité</th>
                <th className="px-8 py-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream/10">
              {dynamicMenu.map((item) => (
                <tr
                  key={item.id}
                  className={`text-sm transition-colors hover:bg-cream/5 ${
                    !item.available ? "bg-gray-50/50" : ""
                  }`}
                >
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-4">
                      <div className="h-14 w-14 overflow-hidden rounded-2xl bg-cream shadow-sm">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-primary text-base leading-tight">
                          {item.name}
                        </span>
                        <span className="text-[10px] text-primary/40 truncate max-w-[200px] mt-1">
                          {item.description}
                        </span>
                        {item.allergensList && item.allergensList.length > 0 ? (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {item.allergensList.map((a: any) => (
                              <span key={a.id} className="text-[8px] font-black uppercase tracking-wider bg-creamSoft/70 text-primary/70 px-1.5 py-0.5 rounded-md border border-cream/10">
                                {a.emoji} {a.name} {a.value ? `(${a.value})` : ""}
                              </span>
                            ))}
                          </div>
                        ) : item.preferences && item.preferences.length > 0 ? (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {item.preferences.map((p) => {
                              const label = p === "veg" ? "🥬 Veg" : p === "spicy" ? "🌶️ Épicé" : p === "halal" ? "🌙 Halal" : p === "nutfree" ? "🥜 Sans arachide" : p === "glutenfree" ? "🌾 Sans gluten" : p;
                              return (
                                <span key={p} className="text-[8px] font-black uppercase tracking-wider bg-creamSoft/70 text-primary/70 px-1.5 py-0.5 rounded-md border border-cream/10">
                                  {label}
                                </span>
                              );
                            })}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <span className="text-[10px] font-black text-primary/60 bg-cream/30 px-3 py-1 rounded-lg uppercase tracking-widest border border-cream/20">
                      {CATEGORY_LABELS[item.category as keyof typeof CATEGORY_LABELS] ||
                        item.category}
                    </span>
                  </td>
                  <td className="px-8 py-5">
                    <span className="font-display font-black text-primary text-lg">
                      {item.price.toFixed(2)} €
                    </span>
                  </td>
                  <td className="px-8 py-5">
                    <button
                      onClick={() => updateMenuItem(item.id, { available: !item.available })}
                      className={`inline-flex rounded-full px-4 py-1.5 text-[9px] font-black uppercase tracking-widest transition-all ${
                        item.available
                          ? "bg-green-100 text-green-700 hover:bg-green-200"
                          : "bg-red-50 text-red-500 hover:bg-red-100"
                      }`}
                    >
                      {item.available ? "En ligne" : "Épuisé"}
                    </button>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex justify-end items-center gap-4">
                      <button
                        onClick={() => handleEdit(item)}
                        className="text-xs font-black text-accent hover:underline uppercase tracking-widest"
                      >
                        Modifier
                      </button>
                      <button
                        onClick={() => {
                          if (confirm("Supprimer ce plat ?")) deleteMenuItem(item.id);
                        }}
                        className="h-10 w-10 flex items-center justify-center rounded-xl bg-red-50 text-red-500 hover:bg-red-600 hover:text-white transition-all shadow-sm"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {dynamicMenu.length === 0 && (
          <div className="p-20 text-center space-y-4">
            <div className="mx-auto h-16 w-16 bg-cream rounded-full flex items-center justify-center text-primary/20">
              <PlusIcon className="h-8 w-8" />
            </div>
            <p className="text-primary/40 italic font-medium">La carte est vide pour le moment.</p>
          </div>
        )}
      </div>
    </div>
  );
}
