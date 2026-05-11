"use client";

import { useAuth, type Order, type MenuItemDynamic } from "@/components/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { GiftIcon, ArrowRightIcon, TrashIcon, ClockIcon, UserIcon, CartIcon } from "@/components/Icons";
import { formatPrice } from "@/lib/utils";

type Tab = "menu" | "orders" | "dashboard" | "profile";

export default function MonComptePage() {
  const { user, loading, logout, deleteAccount, userOrders, dynamicMenu, updateProfile } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("menu");

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
  
  const recentlyOrderedItems = useMemo(() => {
    if (userOrders.length === 0) return [];
    const allItems = userOrders.flatMap(o => o.items);
    const unique = Array.from(new Set(allItems.map(i => i.name)))
      .map(name => dynamicMenu.find(dm => dm.name === name))
      .filter((i): i is NonNullable<typeof i> => !!i && i.available)
      .slice(0, 3);
    return unique;
  }, [userOrders, dynamicMenu]);

  const suggestedItems = useMemo(() => {
    if (userOrders.length === 0) {
      return dynamicMenu.filter(i => i.category === "signature" && i.available).slice(0, 3);
    }
    const categoryCounts: Record<string, number> = {};
    userOrders.flatMap(o => o.items).forEach(item => {
      const menuData = dynamicMenu.find(dm => dm.name === item.name);
      if (menuData) {
        categoryCounts[menuData.category] = (categoryCounts[menuData.category] || 0) + 1;
      }
    });
    const favoriteCategory = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
    if (!favoriteCategory) return dynamicMenu.filter(i => i.available).slice(0, 3);
    const alreadyOrdered = new Set(userOrders.flatMap(o => o.items.map(i => i.name)));
    const suggestions = dynamicMenu.filter(i => i.category === favoriteCategory && i.available && !alreadyOrdered.has(i.name));
    return suggestions.length > 0 ? suggestions.slice(0, 3) : dynamicMenu.filter(i => i.category === favoriteCategory && i.available).slice(0, 3);
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
      setUpdateMsg("Profil mis à jour !");
      setTimeout(() => setUpdateMsg(""), 3000);
    } catch (err) {
      setUpdateMsg("Erreur.");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="container-x py-10 sm:py-16">
      <div className="grid gap-10 lg:grid-cols-[320px_1fr]">
        
        {/* --- SIDEBAR PERSISTANTE --- */}
        <aside className="space-y-6">
          <div className="rounded-3xl bg-white p-6 shadow-soft ring-1 ring-cream/20">
            <div className="flex flex-col items-center text-center">
              <div className="h-20 w-20 rounded-full bg-accent/10 flex items-center justify-center text-accent mb-4">
                <UserIcon className="h-10 w-10" />
              </div>
              <h2 className="font-display text-xl font-bold text-primary">{user.name}</h2>
              <p className="text-sm text-primary/50 mb-6">{user.email}</p>
              
              <button
                onClick={async () => {
                  await logout();
                  router.push("/login");
                }}
                className="btn btn-md bg-afro-red text-white w-full flex items-center justify-center min-w-[180px] px-6"
              >
                Se déconnecter
              </button>
            </div>
          </div>

          {/* Ma Fidélité : Toujours visible sous le bouton déconnexion */}
          <div className="relative overflow-hidden rounded-3xl bg-primary-gradient p-6 text-cream shadow-soft">
            <div className="afro-side-pattern absolute inset-0 opacity-10" aria-hidden="true" />
            <div className="relative z-10">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-accent/20 text-accent">
                  <GiftIcon className="h-5 w-5" />
                </span>
                <h2 className="font-display text-lg font-bold">Ma Fidélité</h2>
              </div>
              
              <div className="mt-6">
                {isRewardReady ? (
                  <div className="rounded-2xl bg-accent p-4 text-center shadow-glow animate-bounce">
                    <p className="font-bold text-white text-sm">🎉 Cadeau prêt !</p>
                    <p className="text-[10px] text-white/90 mt-0.5">Votre 11ème commande est offerte.</p>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between items-end mb-2">
                      <p className="text-xs text-cream/80 font-semibold">
                        {remaining <= 2 ? "Presque fini ! 🔥" : `Encore ${remaining} repas`}
                      </p>
                      <span className="text-[10px] font-bold text-accent">{currentCycleCount}/10</span>
                    </div>
                    <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-cream/10">
                      <div className={`h-full bg-accent transition-all duration-1000 ${remaining <= 2 ? 'animate-pulse' : ''}`} style={{ width: `${progressPercentage}%` }} />
                    </div>
                    <p className="mt-3 text-[10px] text-cream/50 italic text-center">Après 10 commandes, la 11ème est offerte !</p>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="hidden lg:block rounded-3xl bg-creamSoft p-6 border border-cream/30">
            <h3 className="font-bold text-primary text-sm mb-4">Besoin d'aide ?</h3>
            <Link href="/contact" className="text-xs font-bold text-accent hover:underline flex items-center gap-2">
              Nous contacter <ArrowRightIcon className="h-3 w-3" />
            </Link>
          </div>
        </aside>

        {/* --- ZONE DE CONTENU (TABS) --- */}
        <main>
          {/* Header Mobile / Tablet */}
          <div className="lg:hidden mb-8 border-b border-cream/20 pb-6">
            <h1 className="heading-display text-3xl text-primary">Mon Espace</h1>
          </div>

          {/* Navigation par Onglets */}
          <div className="flex gap-2 sm:gap-6 border-b border-cream/30 overflow-x-auto no-scrollbar scroll-smooth">
            <TabBtn active={activeTab === "menu"} onClick={() => setActiveTab("menu")} label="Le Menu" />
            <TabBtn active={activeTab === "orders"} onClick={() => setActiveTab("orders")} label="Historique" />
            <TabBtn active={activeTab === "dashboard"} onClick={() => setActiveTab("dashboard")} label="Dashboard" />
            <TabBtn active={activeTab === "profile"} onClick={() => setActiveTab("profile")} label="Mon profil" />
          </div>

          <div className="mt-8">
            {/* --- TAB 1: MENU (Suggérés + Lien Menu) --- */}
            {activeTab === "menu" && (
              <div className="space-y-10">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <h2 className="heading-display text-2xl text-primary">Suggestions pour vous</h2>
                  <Link href="/menu" className="btn btn-md btn-primary px-8 flex items-center justify-center min-w-[160px]">
                    Voir tout le menu
                  </Link>
                </div>

                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {suggestedItems.map(item => (
                    <MiniProductCard key={item.id} item={item} label="Commander" />
                  ))}
                </div>

                {recentlyOrderedItems.length > 0 && (
                  <div className="pt-6 border-t border-cream/20">
                    <h3 className="font-display text-xl font-bold text-primary mb-6">Vos classiques</h3>
                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                      {recentlyOrderedItems.map(item => (
                        <MiniProductCard key={item.id} item={item} label="Reprendre" />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* --- TAB 2: ORDERS (Historique) --- */}
            {activeTab === "orders" && (
              <div className="rounded-3xl bg-white p-6 shadow-soft ring-1 ring-cream/20 sm:p-8">
                <h2 className="heading-display text-2xl text-primary mb-6">Mes commandes passées</h2>
                {userOrders.length > 0 ? (
                  <div className="divide-y divide-cream/30">
                    {userOrders.map((order) => (
                      <OrderRow key={order.id} order={order} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <p className="text-primary/60 italic">Aucune commande pour le moment.</p>
                    <Link href="/menu" className="btn btn-primary mt-6 inline-flex">Démarrer ma première commande</Link>
                  </div>
                )}
              </div>
            )}

            {/* --- TAB 3: DASHBOARD (Stats) --- */}
            {activeTab === "dashboard" && (
              <div className="grid gap-6 sm:grid-cols-2">
                <StatCard title="Commandes totales" value={ordersCount} sub="Depuis votre inscription" />
                <StatCard title="Points fidélité" value={currentCycleCount} sub={`Plus que ${remaining} avant cadeau`} />
                <div className="sm:col-span-2 rounded-3xl bg-creamSoft p-8 border border-cream/20">
                  <h3 className="font-bold text-primary mb-4 text-center sm:text-left">Statistiques de consommation</h3>
                  <p className="text-sm text-primary/60 text-center sm:text-left">
                    Vous êtes l'un de nos clients les plus fidèles ! Continuez ainsi pour débloquer des offres exclusives.
                  </p>
                </div>
              </div>
            )}

            {/* --- TAB 4: PROFILE --- */}
            {activeTab === "profile" && (
              <div className="max-w-2xl space-y-8">
                <div className="rounded-3xl bg-white p-6 shadow-soft ring-1 ring-cream/20 sm:p-8">
                  <h2 className="heading-display text-2xl text-primary mb-6">Informations personnelles</h2>
                  <form onSubmit={handleUpdateProfile} className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold uppercase text-primary/60">Nom complet</label>
                        <input type="text" required value={profileForm.name} onChange={e => setProfileForm({...profileForm, name: e.target.value})} className="field" />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold uppercase text-primary/60">Téléphone</label>
                        <input type="tel" required value={profileForm.phone} onChange={e => setProfileForm({...profileForm, phone: e.target.value})} className="field" />
                      </div>
                    </div>
                    <div className="flex items-center gap-4 pt-4">
                      <button type="submit" disabled={isUpdating} className="btn btn-md btn-primary px-10 min-w-[160px]">
                        {isUpdating ? "Enregistrement..." : "Enregistrer"}
                      </button>
                      {updateMsg && <span className="text-sm font-bold text-green-600 animate-fade-in">{updateMsg}</span>}
                    </div>
                  </form>
                </div>

                <div className="rounded-3xl bg-red-50 p-6 shadow-sm ring-1 ring-red-100 sm:p-8">
                  <h2 className="font-display text-xl font-bold text-afro-red mb-2">Zone critique</h2>
                  <p className="text-sm text-afro-red/70 mb-6">L'effacement du compte est immédiat et irréversible.</p>
                  <button onClick={async () => {
                    if (confirm("Supprimer définitivement ?")) {
                      await deleteAccount();
                      router.push("/");
                    }
                  }} className="btn btn-md bg-white border border-red-200 text-afro-red hover:bg-afro-red hover:text-white transition-all">
                    Supprimer mon compte
                  </button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

// ─── Composants Internes ──────────────────────────────────────

function TabBtn({ active, onClick, label }: { active: boolean, onClick: () => void, label: string }) {
  return (
    <button
      onClick={onClick}
      className={`whitespace-nowrap px-4 sm:px-6 py-4 text-sm font-bold uppercase tracking-wider transition-all border-b-2 outline-none ${
        active 
          ? "border-accent text-accent" 
          : "border-transparent text-primary/40 hover:text-primary"
      }`}
    >
      {label}
    </button>
  );
}

function StatCard({ title, value, sub }: { title: string, value: string | number, sub: string }) {
  return (
    <div className="rounded-3xl bg-white p-6 shadow-soft ring-1 ring-cream/20 text-center sm:text-left">
      <p className="text-xs font-bold uppercase tracking-widest text-primary/40 mb-2">{title}</p>
      <p className="font-display text-4xl font-black text-primary">{value}</p>
      <p className="mt-2 text-xs text-primary/60">{sub}</p>
    </div>
  );
}

function MiniProductCard({ item, label }: { item: MenuItemDynamic, label: string }) {
  return (
    <div className="group rounded-3xl bg-white p-4 shadow-sm ring-1 ring-cream/20 hover:shadow-soft transition-all">
      <div className="aspect-square w-full overflow-hidden rounded-2xl bg-creamSoft mb-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={item.image} alt={item.name} className="h-full w-full object-cover transition-transform group-hover:scale-110" />
      </div>
      <h3 className="font-bold text-primary text-base mb-1 truncate">{item.name}</h3>
      <div className="flex items-center justify-between mt-3">
         <span className="text-sm font-bold text-accent">{formatPrice(item.price)}</span>
         <Link href="/menu" className="btn btn-xs bg-primary/5 text-primary hover:bg-accent hover:text-white px-3 py-1.5 text-[10px] uppercase font-bold tracking-widest rounded-lg transition-all min-w-[100px] flex justify-center">
           {label}
         </Link>
      </div>
    </div>
  );
}

function OrderRow({ order }: { order: Order }) {
  return (
    <div className="flex items-center justify-between py-6 first:pt-0 last:pb-0">
      <div className="flex gap-4">
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
          order.status === 'Livré' ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'
        }`}>
          {order.status === 'Livré' ? <GiftIcon className="h-6 w-6" /> : <ClockIcon className="h-6 w-6" />}
        </div>
        <div>
          <p className="font-bold text-primary text-sm sm:text-base">{order.id.substring(0, 8).toUpperCase()}</p>
          <p className="text-xs text-primary/50">{order.createdAt}</p>
          <p className="mt-1 text-[11px] font-medium text-primary/60 leading-tight">
            {order.items.map(i => `${i.quantity}x ${i.name}`).join(", ")}
          </p>
        </div>
      </div>
      <div className="text-right">
        <p className="font-bold text-primary text-sm sm:text-base">{formatPrice(order.total)}</p>
        <span className={`mt-2 inline-block rounded-lg px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest ${
          order.status === "Livré"
            ? "bg-accent text-white"
            : order.status === "En cours"
            ? "bg-blue-600 text-white"
            : "bg-primary text-white"
        }`}>
          {order.status}
        </span>
      </div>
    </div>
  );
}
