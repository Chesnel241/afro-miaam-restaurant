"use client";

import { useState } from "react";
import { useAuth, type MenuItemDynamic } from "@/components/AuthContext";
import { formatPrice } from "@/lib/utils";
import { TrashIcon, PlusIcon, ClockIcon } from "@/components/Icons";
import { CATEGORY_LABELS, CATEGORY_ORDER } from "@/data/menu";

export function AdminMenuManager() {
  const { dynamicMenu, addMenuItem, updateMenuItem, deleteMenuItem } = useAuth();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  // Form state
  const [form, setForm] = useState<Omit<MenuItemDynamic, "id">>({
    name: "",
    description: "",
    price: 0,
    image: "/img/signatures/mafe.jpg",
    category: "signature",
    tags: [],
    available: true,
  });

  const handleEdit = (item: MenuItemDynamic) => {
    setEditingId(item.id);
    setForm({
      name: item.name,
      description: item.description,
      price: item.price,
      image: item.image,
      category: item.category,
      tags: item.tags || [],
      available: item.available,
    });
    setIsAdding(false);
  };

  const handleCancel = () => {
    setEditingId(null);
    setIsAdding(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateMenuItem(editingId, form);
      } else {
        await addMenuItem(form);
      }
      handleCancel();
    } catch (err) {
      alert("Erreur lors de l'enregistrement");
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="heading-display text-2xl text-primary">Gestion de la Carte</h2>
        {!isAdding && !editingId && (
          <button 
            onClick={() => {
              setIsAdding(true);
              setForm({
                name: "",
                description: "",
                price: 0,
                image: "/img/signatures/mafe.jpg",
                category: "signature",
                tags: [],
                available: true,
              });
            }}
            className="btn btn-sm bg-accent text-white"
          >
            <PlusIcon className="h-4 w-4" /> Ajouter un plat
          </button>
        )}
      </div>

      {/* Formulaire Ajout / Edition */}
      {(isAdding || editingId) && (
        <form onSubmit={handleSubmit} className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-cream/20 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <h3 className="font-bold text-primary mb-2">{editingId ? "Modifier le plat" : "Nouveau plat"}</h3>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-primary/60 mb-1">Nom du plat</label>
            <input 
              type="text" 
              required 
              value={form.name}
              onChange={e => setForm({...form, name: e.target.value})}
              className="w-full rounded-xl border border-cream/30 px-4 py-2 text-sm focus:border-accent outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-primary/60 mb-1">Prix (€)</label>
            <input 
              type="number" 
              step="0.1" 
              required 
              value={form.price}
              onChange={e => setForm({...form, price: parseFloat(e.target.value)})}
              className="w-full rounded-xl border border-cream/30 px-4 py-2 text-sm focus:border-accent outline-none"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-bold uppercase text-primary/60 mb-1">Description</label>
            <textarea 
              required 
              value={form.description}
              onChange={e => setForm({...form, description: e.target.value})}
              className="w-full rounded-xl border border-cream/30 px-4 py-2 text-sm focus:border-accent outline-none"
              rows={2}
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-primary/60 mb-1">Catégorie</label>
            <select 
              value={form.category}
              onChange={e => setForm({...form, category: e.target.value})}
              className="w-full rounded-xl border border-cream/30 px-4 py-2 text-sm focus:border-accent outline-none bg-white"
            >
              {CATEGORY_ORDER.map(c => (
                <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-primary/60 mb-1">Image (URL)</label>
            <input 
              type="text" 
              required 
              value={form.image}
              onChange={e => setForm({...form, image: e.target.value})}
              className="w-full rounded-xl border border-cream/30 px-4 py-2 text-sm focus:border-accent outline-none"
              placeholder="/img/signatures/mafe.jpg"
            />
          </div>
          <div className="sm:col-span-2 flex items-center gap-4 mt-2">
             <button type="submit" className="btn btn-sm bg-primary text-white px-8">Enregistrer</button>
             <button type="button" onClick={handleCancel} className="text-sm font-bold text-primary/60 hover:text-primary transition">Annuler</button>
          </div>
        </form>
      )}

      {/* Liste des plats */}
      <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-cream/20">
        <table className="w-full text-left border-collapse">
          <thead className="bg-creamSoft text-primary text-xs font-bold uppercase tracking-wider">
            <tr>
              <th className="px-6 py-4">Plat</th>
              <th className="px-6 py-4">Catégorie</th>
              <th className="px-6 py-4">Prix</th>
              <th className="px-6 py-4">Statut</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-cream/20">
            {dynamicMenu.filter(i => i.available || editingId === i.id).map(item => (
              <tr key={item.id} className="text-sm hover:bg-cream/5">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 overflow-hidden rounded-lg bg-cream">
                      <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                    </div>
                    <span className="font-bold text-primary">{item.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="text-xs font-semibold text-primary/60 bg-cream/40 px-2 py-1 rounded-full uppercase tracking-wider">
                    {CATEGORY_LABELS[item.category as keyof typeof CATEGORY_LABELS] || item.category}
                  </span>
                </td>
                <td className="px-6 py-4 font-bold text-primary">{item.price.toFixed(2)} €</td>
                <td className="px-6 py-4">
                  <button 
                    onClick={() => updateMenuItem(item.id, { available: !item.available })}
                    className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                      item.available ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {item.available ? 'Disponible' : 'Épuisé'}
                  </button>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-3">
                    <button onClick={() => handleEdit(item)} className="text-primary hover:text-accent font-bold">Editer</button>
                    <button onClick={() => deleteMenuItem(item.id)} className="text-afro-red/60 hover:text-afro-red transition">
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {dynamicMenu.length === 0 && <p className="p-10 text-center text-primary/50 italic">Aucun plat dans la base.</p>}
      </div>
    </div>
  );
}
