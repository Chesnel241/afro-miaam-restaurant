"use client";

import { useAuth, type Order } from "@/components/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { GiftIcon, ArrowRightIcon, TrashIcon, ClockIcon, UserIcon, CartIcon } from "@/components/Icons";
import { formatPrice } from "@/lib/utils";

type Tab = "dashboard" | "orders" | "profile";

export default function MonComptePage() {
  const { user, loading, logout, deleteAccount, userOrders, dynamicMenu, updateProfile } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");

  // Profile Form State
  const [profileForm, setProfileForm] = useState({
    name: "",
    phone: "",
  });
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateMsg, setUpdateMsg] = useState("");

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    } else if (!loading && user?.role === "admin") {
      router.push("/admin");
    } else if (user) {
      setProfileForm({
        name: user.name || "",
        phone: user.phone || "",
      });
    }
  }, [user, loading, router]);

  // --- Logique intelligente de personnalisation ---
  
  // 1. "Vous avez commandé récemment"
  const recentlyOrderedItems = useMemo(() => {
    if (userOrders.length === 0) return [];
    const allItems = userOrders.flatMap(o => o.items);
    // Unifier par nom et garder les 3 plus récents uniques
    const unique = Array.from(new Set(allItems.map(i => i.name)))
      .map(name => {
        const itemData = dynamicMenu.find(dm => dm.name === name);
        return itemData;
      })
      .filter((i): i is NonNullable<typeof i> => !!i && i.available)
      .slice(0, 3);
    return unique;
  }, [userOrders, dynamicMenu]);

  // 2. "Parce que vous aimez..." (Suggestions basées sur la catégorie la plus commandée)
  const suggestedItems = useMemo(() => {
    if (userOrders.length === 0) {
      // Si pas de commande, suggérer les signatures populaires
      return dynamicMenu.filter(i => i.category === "signature" && i.available).slice(0, 3);
    }
    
    // Trouver la catégorie préférée
    const categoryCounts: Record<string, number> = {};
    userOrders.flatMap(o => o.items).forEach(item => {
      const menuData = dynamicMenu.find(dm => dm.name === item.name);
      if (menuData) {
        categoryCounts[menuData.category] = (categoryCounts[menuData.category] || 0) + 1;
      }
    });

    const favoriteCategory = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
    
    if (!favoriteCategory) return dynamicMenu.filter(i => i.available).slice(0, 3);

    // Suggérer des plats de cette catégorie que le client n'a PAS encore commandé, ou juste les meilleurs
    const alreadyOrdered = new Set(userOrders.flatMap(o => o.items.map(i => i.name)));
    const suggestions = dynamicMenu.filter(i => 
      i.category === favoriteCategory && 
      i.available && 
      !alreadyOrdered.has(i.name)
    );

    return suggestions.length > 0 
      ? suggestions.slice(0, 3) 
      : dynamicMenu.filter(i => i.category === favoriteCategory && i.available).slice(0, 3);
  }, [userOrders, dynamicMenu]);

  if (loading) {
    return (
      <div className="container-x flex min-h-[40vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-cream border-t-accent" />
      </div>
    );
  }

  if (!user || user.role !== "customer") return null;

  const ordersCount = user.ordersCount;
  const maxOrders = 10;
  const currentCycleCount = ordersCount % maxOrders;
  const progressPercentage = Math.min((currentCycleCount / maxOrders) * 100, 100);
  const remaining = maxOrders - currentCycleCount;
  const isRewardReady = ordersCount > 0 && currentCycleCount === 0;

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    setUpdateMsg("");
    try {
      await updateProfile(profileForm);
      setUpdateMsg("Profil mis à jour avec succès !");
      setTimeout(() => setUpdateMsg(""), 3000);
    } catch (err) {
      setUpdateMsg("Erreur lors de la mise à jour.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (confirm("⚠️ Action irréversible. Êtes-vous sûr de vouloir supprimer votre compte et toutes vos données de fidélité ?")) {
      try {
        await deleteAccount();
        router.push("/");
      } catch (err) {
        alert("Erreur lors de la suppression du compte.");
      }
    }
  };

  return (
    <div className="container-x py-12 sm:py-20">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between border-b border-cream/20 pb-8">
        <div>
          <h1 className="heading-display text-3xl text-primary sm:text-4xl">
            Mon <span className="text-accent">Espace</span>
          </h1>
          <p className="mt-2 text-primary/75 leading-relaxed">
            Content de vous revoir, <strong className="text-primary">{user.name}</strong>.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={async () => {
              await logout();
              router.push("/login");
            }}
            className="btn btn-sm btn-danger"
          >
            Se déconnecter
          </button>
        </div>
      </div>

      {/* Onglets */}
      <div className="mt-8 flex gap-4 border-b border-cream/30">
        <TabBtn active={activeTab === "dashboard"} onClick={() => setActiveTab("dashboard")} label="Tableau de bord" />
        <TabBtn active={activeTab === "orders"} onClick={() => setActiveTab("orders")} label="Mes commandes" />
        <TabBtn active={activeTab === "profile"} onClick={() => setActiveTab("profile")} label="Mon profil" />
      </div>

      <div className="mt-10">
        {/* --- TAB: DASHBOARD --- */}
        {activeTab === "dashboard" && (
          <div className="grid gap-10 lg:grid-cols-[1fr_2fr]">
            {/* Colonne Fidélité */}
            <div className="space-y-6">
              <div className="relative overflow-hidden rounded-2xl bg-primary-gradient p-6 text-cream shadow-soft">
                <div className="afro-side-pattern absolute inset-0 opacity-10" aria-hidden="true" />
                <div className="relative z-10">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-accent/20 text-accent">
                      <GiftIcon className="h-5 w-5" />
                    </span>
                    <h2 className="font-display text-xl font-bold">Ma Fidélité</h2>
                  </div>
                  
                  <div className="mt-6">
                    {isRewardReady ? (
                      <div className="rounded-xl bg-accent p-6 text-center shadow-glow animate-bounce">
                        <p className="font-bold text-white text-lg">🎉 Cadeau prêt !</p>
                        <p className="text-sm text-white/90 mt-1">Votre 11ème commande est offerte.</p>
                      </div>
                    ) : (
                      <>
                        <div className="flex justify-between items-end mb-2">
                          <p className="text-sm text-cream/80 leading-snug">
                            {remaining <= 2 ? "Bientôt le cadeau ! 🔥" : `Plus que ${remaining} commande${remaining > 1 ? 's' : ''}`}
                          </p>
                          <span className="text-xs font-bold text-accent">{currentCycleCount}/10</span>
                        </div>
                        <div className="relative h-3 w-full overflow-hidden rounded-full bg-cream/10">
                          <div className={`h-full bg-accent transition-all duration-1000 ${remaining <= 2 ? 'animate-pulse' : ''}`} style={{ width: `${progressPercentage}%` }} />
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Raccourci Profil */}
              <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-cream/20">
                <h3 className="font-bold text-primary flex items-center gap-2">
                   <UserIcon className="h-4 w-4 text-accent" /> Infos rapides
                </h3>
                <div className="mt-4 space-y-2 text-sm">
                   <p><span className="text-primary/60">Tel:</span> {user.phone || "Non renseigné"}</p>
                   <p><span className="text-primary/60">Email:</span> {user.email}</p>
                   <button onClick={() => setActiveTab("profile")} className="text-accent text-xs font-bold hover:underline mt-2">Modifier mon profil</button>
                </div>
              </div>
            </div>

            {/* Colonne Personnalisation */}
            <div className="space-y-10">
              {/* Récemment commandé */}
              {recentlyOrderedItems.length > 0 && (
                <div>
                  <h2 className="heading-display text-2xl text-primary mb-6">Commandé récemment</h2>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {recentlyOrderedItems.map(item => (
                      <MiniProductCard key={item.id} item={item} label="Racheter" />
                    ))}
                  </div>
                </div>
              )}

              {/* Suggestions intelligentes */}
              <div>
                <h2 className="heading-display text-2xl text-primary mb-6">Pour vous faire plaisir...</h2>
                <p className="text-sm text-primary/60 -mt-4 mb-6">Basé sur vos goûts préférés chez Afro Miaam.</p>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {suggestedItems.map(item => (
                    <MiniProductCard key={item.id} item={item} label="Découvrir" />
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- TAB: ORDERS --- */}
        {activeTab === "orders" && (
          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-cream/20 sm:p-8 max-w-4xl mx-auto">
            <h2 className="heading-display text-2xl text-primary">Mon historique</h2>
            {userOrders.length > 0 ? (
              <div className="mt-6 divide-y divide-cream/30">
                {userOrders.map((order) => (
                  <OrderRow key={order.id} order={order} />
                ))}
              </div>
            ) : (
              <div className="mt-10 text-center py-10">
                <p className="text-primary/60 italic">Vous n&apos;avez pas encore passé de commande.</p>
                <Link href="/menu" className="btn btn-primary mt-6 inline-flex">Voir le menu</Link>
              </div>
            )}
          </div>
        )}

        {/* --- TAB: PROFILE --- */}
        {activeTab === "profile" && (
          <div className="max-w-2xl mx-auto space-y-8">
            <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-cream/20 sm:p-8">
              <h2 className="heading-display text-2xl text-primary mb-6">Modifier mes informations</h2>
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-primary/60 mb-1">Nom complet</label>
                  <input 
                    type="text" 
                    required 
                    value={profileForm.name}
                    onChange={e => setProfileForm({...profileForm, name: e.target.value})}
                    className="field"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-primary/60 mb-1">Numéro de téléphone</label>
                  <input 
                    type="tel" 
                    required 
                    value={profileForm.phone}
                    onChange={e => setProfileForm({...profileForm, phone: e.target.value})}
                    className="field"
                    placeholder="06 00 00 00 00"
                  />
                </div>
                <div className="flex items-center gap-4 pt-2">
                  <button type="submit" disabled={isUpdating} className="btn btn-md btn-primary px-8">
                    {isUpdating ? "Enregistrement..." : "Enregistrer"}
                  </button>
                  {updateMsg && <span className="text-sm font-bold text-green-600">{updateMsg}</span>}
                </div>
              </form>
            </div>

            <div className="rounded-2xl bg-red-50 p-6 shadow-sm ring-1 ring-red-200 sm:p-8">
              <h2 className="font-display text-xl font-bold text-afro-red mb-2">Zone de danger</h2>
              <p className="text-sm text-afro-red/70 mb-6">
                La suppression de votre compte est définitive. Vous perdrez tout votre historique de commandes et vos points de fidélité accumulés.
              </p>
              <button
                onClick={handleDelete}
                className="btn btn-md btn-danger w-full sm:w-auto"
              >
                Supprimer mon compte définitivement
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Composants Internes ──────────────────────────────────────

function TabBtn({ active, onClick, label }: { active: boolean, onClick: () => void, label: string }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-3 text-sm font-bold uppercase tracking-wider transition-all border-b-2 ${
        active 
          ? "border-accent text-accent" 
          : "border-transparent text-primary/60 hover:text-primary"
      }`}
    >
      {label}
    </button>
  );
}

function MiniProductCard({ item, label }: { item: any, label: string }) {
  return (
    <div className="group rounded-2xl bg-white p-3 shadow-sm ring-1 ring-cream/20 hover:shadow-soft transition-all">
      <div className="aspect-square w-full overflow-hidden rounded-xl bg-creamSoft mb-3">
        <img src={item.image} alt={item.name} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
      </div>
      <h3 className="font-bold text-primary text-sm mb-1">{item.name}</h3>
      <div className="flex items-center justify-between">
         <span className="text-xs font-bold text-accent">{formatPrice(item.price)}</span>
         <Link href="/menu" className="text-[10px] font-bold uppercase tracking-widest text-primary/40 hover:text-accent transition">
           {label}
         </Link>
      </div>
    </div>
  );
}

function OrderRow({ order }: { order: Order }) {
  return (
    <div className="flex items-center justify-between py-5 first:pt-0 last:pb-0">
      <div className="flex gap-4">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
          order.status === 'Livré' ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'
        }`}>
          {order.status === 'Livré' ? <GiftIcon className="h-5 w-5" /> : <ClockIcon className="h-5 w-5" />}
        </div>
        <div>
          <p className="font-bold text-primary">{order.id.substring(0, 8).toUpperCase()}</p>
          <p className="text-sm text-primary/60">{order.createdAt}</p>
          <p className="mt-1 text-xs text-primary/50">
            {order.items.map(i => `${i.quantity}x ${i.name}`).join(", ")}
          </p>
        </div>
      </div>
      <div className="text-right">
        <p className="font-bold text-primary">{formatPrice(order.total)}</p>
        <span className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
          order.status === "Livré"
            ? "bg-accent/10 text-accent"
            : order.status === "En cours"
            ? "bg-blue-100 text-blue-700"
            : "bg-orange-100 text-orange-700"
        }`}>
          {order.status}
        </span>
      </div>
    </div>
  );
}
