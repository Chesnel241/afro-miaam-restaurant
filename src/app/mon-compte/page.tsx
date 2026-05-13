"use client";

import { useAuth, type Order, type MenuItemDynamic } from "@/components/AuthContext";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useMemo, Suspense } from "react";
import Link from "next/link";
import { GiftIcon, ArrowRightIcon, TrashIcon, ClockIcon, UserIcon, CartIcon } from "@/components/Icons";
import { formatPrice } from "@/lib/utils";
import dynamic from "next/dynamic";

const QRScannerModal = dynamic(
  () => import("@/components/QRScannerModal").then((mod) => mod.QRScannerModal),
  { ssr: false }
);

type Tab = "menu" | "orders" | "dashboard" | "profile";

function MonCompteContent() {
  const { user, loading, logout, deleteAccount, userOrders, dynamicMenu, updateProfile } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Onglet par défaut ou depuis l'URL
  const [activeTab, setActiveTab] = useState<Tab>("menu");

  useEffect(() => {
    const tab = searchParams.get("tab") as Tab;
    if (tab && ["menu", "orders", "dashboard", "profile"].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  // Profile Form State
  const [profileForm, setProfileForm] = useState({
    name: "",
    phone: "",
  });
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateMsg, setUpdateMsg] = useState("");
  const [showScanner, setShowScanner] = useState(false);

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

  const totalOrders = userOrders.length;
  const deliveredOrders = userOrders.filter(o => o.status === "Livré").length;

  const maxOrders = 10;
  const currentCycleCount = deliveredOrders % maxOrders;
  const progressPercentage = Math.min((currentCycleCount / maxOrders) * 100, 100);
  const remaining = maxOrders - currentCycleCount;
  const isRewardReady = deliveredOrders > 0 && currentCycleCount === 0;

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
    <div className="container-x py-8 sm:py-16 overflow-hidden max-w-full">
      {showScanner && <QRScannerModal onClose={() => setShowScanner(false)} />}
      <div className="grid gap-8 lg:grid-cols-[300px_1fr]">
        
        {/* --- SIDEBAR / MOBILE HEADER --- */}
        <aside className="space-y-6">
          <div className="rounded-2xl sm:rounded-3xl bg-white p-5 sm:p-6 shadow-soft ring-1 ring-cream/20">
            <div className="flex flex-col items-center text-center">
              <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-full bg-accent/10 flex items-center justify-center text-accent mb-4">
                <UserIcon className="h-8 w-8 sm:h-10 sm:w-10" />
              </div>
              <h2 className="font-display text-lg sm:text-xl font-bold text-primary">{user.name}</h2>
              <p className="text-xs sm:text-sm text-primary/50 mb-6 truncate max-w-full px-4">{user.email}</p>
              
              <button
                onClick={async () => {
                  await logout();
                  router.push("/login");
                }}
                className="btn btn-md bg-afro-red text-white w-full flex items-center justify-center min-w-0 px-4 text-sm sm:text-base h-12"
              >
                Se déconnecter
              </button>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-primary-gradient p-5 sm:p-6 text-cream shadow-soft">
            <div className="afro-side-pattern absolute inset-0 opacity-10" aria-hidden="true" />
            <div className="relative z-10">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-accent/20 text-accent">
                  <GiftIcon className="h-4 w-4" />
                </span>
                <h2 className="font-display text-base sm:text-lg font-bold">Ma Fidélité</h2>
              </div>
              
              <div className="mt-5">
                {isRewardReady ? (
                  <div className="rounded-xl bg-accent p-3 text-center shadow-glow animate-bounce">
                    <p className="font-bold text-white text-xs">🎉 Cadeau prêt !</p>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between items-end mb-2">
                      <p className="text-[10px] sm:text-xs text-cream/80 font-semibold leading-none">
                        {remaining <= 2 ? "Presque fini ! 🔥" : `${remaining} repas restants`}
                      </p>
                      <span className="text-[10px] font-bold text-accent leading-none">{currentCycleCount}/10</span>
                    </div>
                    <div className="relative h-2 w-full overflow-hidden rounded-full bg-cream/10">
                      <div className={`h-full bg-accent transition-all duration-1000 ${remaining <= 2 ? 'animate-pulse' : ''}`} style={{ width: `${progressPercentage}%` }} />
                    </div>
                  </>
                )}
                <p className="mt-3 text-[9px] text-cream/40 italic text-center">La 11ème commande est offerte !</p>
              </div>
            </div>
          </div>
        </aside>

        {/* --- ZONE DE CONTENU --- */}
        <main className="min-w-0">
          <div className="mb-6">
            <h1 className="heading-display text-2xl sm:text-3xl text-primary">Mon Espace</h1>
          </div>

          <div className="flex gap-1 sm:gap-4 border-b border-cream/30 overflow-x-auto no-scrollbar scroll-smooth mb-8">
            <TabBtn active={activeTab === "menu"} onClick={() => setActiveTab("menu")} label="Le Menu" />
            <TabBtn active={activeTab === "orders"} onClick={() => setActiveTab("orders")} label="Historique" />
            <TabBtn active={activeTab === "dashboard"} onClick={() => setActiveTab("dashboard")} label="Dashboard" />
            <TabBtn active={activeTab === "profile"} onClick={() => setActiveTab("profile")} label="Mon profil" />
          </div>

          <div className="space-y-8">
            {activeTab === "menu" && (
              <div className="space-y-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <h2 className="heading-display text-xl sm:text-2xl text-primary">Suggestions pour vous</h2>
                  <Link href="/menu" className="btn btn-md btn-primary px-8 flex items-center justify-center h-12 sm:h-auto">
                    Voir tout le menu
                  </Link>
                </div>

                <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                  {suggestedItems.map(item => (
                    <MiniProductCard key={item.id} item={item} label="Commander" />
                  ))}
                </div>

                {recentlyOrderedItems.length > 0 && (
                  <div className="pt-8 border-t border-cream/20">
                    <h3 className="font-display text-lg sm:text-xl font-bold text-primary mb-6">Vos classiques</h3>
                    <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                      {recentlyOrderedItems.map(item => (
                        <MiniProductCard key={item.id} item={item} label="Reprendre" />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === "orders" && (
              <div className="rounded-2xl sm:rounded-3xl bg-white p-5 sm:p-8 shadow-soft ring-1 ring-cream/20">
                <h2 className="heading-display text-xl sm:text-2xl text-primary mb-6">Mes commandes</h2>
                {userOrders.length > 0 ? (
                  <div className="divide-y divide-cream/30">
                    {userOrders.map((order) => (
                      <OrderRow key={order.id} order={order} onScan={() => setShowScanner(true)} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <p className="text-primary/60 text-sm italic">Aucune commande pour le moment.</p>
                    <Link href="/menu" className="btn btn-primary mt-6 inline-flex">Commander mon premier repas</Link>
                  </div>
                )}
              </div>
            )}

            {activeTab === "dashboard" && (
              <div className="grid gap-4 sm:gap-6 sm:grid-cols-2">
                <StatCard title="Commandes" value={totalOrders} sub="Total passé" />
                <StatCard title="Fidélité (Repas livrés)" value={deliveredOrders} sub={`${remaining} restants avant cadeau`} />
              </div>
            )}

            {activeTab === "profile" && (
              <div className="space-y-8 max-w-full overflow-hidden">
                <div className="rounded-2xl sm:rounded-3xl bg-white p-5 sm:p-8 shadow-soft ring-1 ring-cream/20">
                  <h2 className="heading-display text-xl sm:text-2xl text-primary mb-6">Profil</h2>
                  <form onSubmit={handleUpdateProfile} className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase text-primary/60">Nom complet</label>
                        <input type="text" required value={profileForm.name} onChange={e => setProfileForm({...profileForm, name: e.target.value})} className="field h-11 text-sm" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase text-primary/60">Téléphone</label>
                        <input type="tel" required value={profileForm.phone} onChange={e => setProfileForm({...profileForm, phone: e.target.value})} className="field h-11 text-sm" />
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row items-center gap-4 pt-4">
                      <button type="submit" disabled={isUpdating} className="btn btn-md btn-primary w-full sm:w-auto px-10 h-12">
                        {isUpdating ? "Enregistrement..." : "Enregistrer"}
                      </button>
                      {updateMsg && <span className="text-xs font-bold text-green-600">{updateMsg}</span>}
                    </div>
                  </form>
                </div>

                <div className="rounded-2xl sm:rounded-3xl bg-red-50 p-5 sm:p-8 ring-1 ring-red-100">
                  <h2 className="font-display text-lg font-bold text-afro-red mb-2">Suppression</h2>
                  <p className="text-xs text-afro-red/70 mb-6 leading-relaxed">Cette action est immédiate et irréversible.</p>
                  <button onClick={async () => {
                    if (confirm("Supprimer définitivement ?")) {
                      await deleteAccount();
                      router.push("/");
                    }
                  }} className="text-xs font-bold text-afro-red hover:underline uppercase tracking-widest">
                    Supprimer mon compte définitivement
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

export default function MonComptePage() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <MonCompteContent />
    </Suspense>
  );
}

function TabBtn({ active, onClick, label }: { active: boolean, onClick: () => void, label: string }) {
  return (
    <button
      onClick={onClick}
      className={`whitespace-nowrap px-3 sm:px-6 py-4 text-[10px] sm:text-xs font-bold uppercase tracking-[0.1em] transition-all border-b-2 outline-none ${
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
    <div className="rounded-2xl bg-white p-5 sm:p-6 shadow-soft ring-1 ring-cream/20 text-center sm:text-left">
      <p className="text-[10px] font-bold uppercase tracking-widest text-primary/40 mb-2">{title}</p>
      <p className="font-display text-3xl sm:text-4xl font-black text-primary">{value}</p>
      <p className="mt-2 text-xs text-primary/60">{sub}</p>
    </div>
  );
}

function MiniProductCard({ item, label }: { item: MenuItemDynamic, label: string }) {
  return (
    <div className="group rounded-2xl bg-white p-3 sm:p-4 shadow-sm ring-1 ring-cream/20 hover:shadow-soft transition-all">
      <div className="aspect-square w-full overflow-hidden rounded-xl bg-creamSoft mb-4">
        <img src={item.image} alt={item.name} className="h-full w-full object-cover transition-transform group-hover:scale-110" />
      </div>
      <h3 className="font-bold text-primary text-sm sm:text-base mb-1 truncate">{item.name}</h3>
      <div className="flex items-center justify-between mt-3">
         <span className="text-xs sm:text-sm font-bold text-accent">{formatPrice(item.price)}</span>
         <Link href="/menu" className="btn btn-xs bg-primary/5 text-primary hover:bg-accent hover:text-white px-3 py-2 text-[9px] uppercase font-bold tracking-widest rounded-lg transition-all min-w-[80px] flex justify-center">
           {label}
         </Link>
      </div>
    </div>
  );
}

function OrderRow({ order, onScan }: { order: Order, onScan: () => void }) {
  const dateObj = new Date(order.createdAt);
  const formattedDate = dateObj.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="py-6 first:pt-0 last:pb-0 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        {/* Partie Gauche : Icône + ID + Date */}
        <div className="flex gap-4 min-w-0">
          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-sm ${
            order.status === 'Livré' ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'
          }`}>
            {order.status === 'Livré' ? <GiftIcon className="h-6 w-6" /> : <ClockIcon className="h-6 w-6" />}
          </div>
          <div className="min-w-0 flex flex-col justify-center">
            <h4 className="font-display font-black text-primary text-base tracking-tight truncate">
              {order.id.substring(0, 8).toUpperCase()}
            </h4>
            <p className="text-[10px] font-bold text-primary/40 uppercase tracking-widest">{formattedDate}</p>
          </div>
        </div>

        {/* Partie Droite : Prix & Badge Status */}
        <div className="flex flex-col items-end shrink-0 gap-2">
          <p className="font-display font-black text-primary text-lg leading-none">{formatPrice(order.total)}</p>
          <span className={`inline-block rounded-full px-3 py-1 text-[8px] font-black uppercase tracking-[0.1em] shadow-sm ${
            order.status === "Livré"
              ? "bg-accent text-white"
              : order.status === "En cours" || order.status === "Acompte Reçu"
              ? "bg-blue-600 text-white shadow-md animate-pulse"
              : order.status === "Attente Acompte"
              ? "bg-afro-red text-white"
              : "bg-primary text-white"
          }`}>
            {order.status}
          </span>
        </div>
      </div>

      {/* Description des plats : Prend toute la largeur, sous les infos principales */}
      <div className="pl-16 pr-2">
        <p className="text-xs font-medium text-primary/70 leading-relaxed italic border-l-2 border-cream/30 pl-3">
          {order.items.map(i => `${i.quantity}x ${i.name}`).join(", ")}
        </p>

        {(order.status === "En cours" || order.status === "Acompte Reçu") && (
          <button 
            onClick={onScan}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 text-[10px] font-black uppercase tracking-[0.15em] text-white shadow-glow transition-all hover:scale-[1.02] active:scale-95"
          >
            <span className="text-sm">📸</span> Scanner Livraison
          </button>
        )}
      </div>
    </div>
  );
}
