"use client";

import { useAuth, type Order, type MenuItemDynamic } from "@/components/AuthContext";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useMemo, Suspense } from "react";
import Link from "next/link";
import { GiftIcon, ArrowRightIcon, TrashIcon, ClockIcon, UserIcon, CartIcon, StarIcon } from "@/components/Icons";
import { formatPrice } from "@/lib/utils";
import dynamic from "next/dynamic";
import { MemberCard } from "@/components/MemberCard";
import { useCart } from "@/components/CartContext";

const QRScannerModal = dynamic(
  () => import("@/components/QRScannerModal").then((mod) => mod.QRScannerModal),
  { ssr: false }
);

type Tab = "menu" | "orders" | "dashboard" | "profile";

function MonCompteContent() {
  const { user, loading, logout, deleteAccount, userOrders, dynamicMenu, updateProfile, confirmOrderDeletion } = useAuth();
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

  const pendingDeletions = userOrders.filter(o => (o as any).deletionRequested);

  return (
    <div className="container-x py-8 sm:py-16 overflow-hidden max-w-full">
      {showScanner && <QRScannerModal onClose={() => setShowScanner(false)} />}
      <div className="grid gap-8 lg:grid-cols-[300px_1fr]">
        
        {/* --- SIDEBAR / MOBILE HEADER --- */}
        <aside className="space-y-6">
          <MemberCard 
            userName={user.name} 
            ordersCount={user.ordersCount} 
            referralCredits={(user as any).referralCredits || 0} 
          />

          <div className="rounded-[2rem] bg-white p-6 shadow-soft ring-1 ring-cream/20">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/40 mb-4">Gestion du compte</h3>
            <button
              onClick={async () => {
                await logout();
                router.push("/login");
              }}
              className="btn btn-md bg-afro-red/10 text-afro-red w-full border-none hover:bg-afro-red hover:text-white transition-all font-black text-xs tracking-widest"
            >
              SE DÉCONNECTER
            </button>
          </div>
        </aside>

        {/* --- ZONE DE CONTENU --- */}
        <main className="min-w-0">
          {pendingDeletions.length > 0 && (
            <div className="mb-8 overflow-hidden rounded-3xl bg-blue-600 p-1 shadow-lg">
              <div className="rounded-[1.4rem] bg-white p-6 sm:p-8">
                <div className="flex flex-col sm:flex-row items-center gap-6">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                    <ClockIcon className="h-8 w-8" />
                  </div>
                  <div className="flex-1 text-center sm:text-left">
                    <h3 className="font-display text-xl font-black text-primary">Optimisation de votre espace</h3>
                    <p className="mt-2 text-sm text-primary/60 leading-relaxed">
                      Souhaitez-vous archiver <span className="font-bold text-blue-600">{pendingDeletions.length} ancienne(s) commande(s)</span> de votre historique pour plus de clarté ?
                    </p>
                  </div>
                  <div className="flex gap-3 shrink-0">
                    <button 
                      onClick={() => pendingDeletions.forEach(o => confirmOrderDeletion(o.id, true))}
                      className="btn btn-md bg-blue-600 text-white px-8 shadow-glow"
                    >
                      Oui, archiver
                    </button>
                    <button 
                      onClick={() => pendingDeletions.forEach(o => confirmOrderDeletion(o.id, false))}
                      className="btn btn-md bg-creamSoft text-primary border border-cream/20 px-6"
                    >
                      Plus tard
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          
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
              <div className="space-y-6">
                <div className="grid gap-4 sm:gap-6 sm:grid-cols-2">
                  <StatCard title="Commandes" value={totalOrders} sub="Total passé" />
                  <StatCard title="Fidélité (Repas livrés)" value={deliveredOrders} sub={`${remaining} restants avant cadeau`} />
                </div>

                <div className="rounded-3xl bg-primary-gradient p-8 text-cream shadow-soft relative overflow-hidden">
                  <div className="afro-side-pattern absolute inset-0 opacity-10 pointer-events-none" />
                  <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                    <div className="flex-1">
                      <h3 className="heading-display text-2xl mb-2">Afro Family</h3>
                      <p className="text-sm text-cream/70 font-medium max-w-md">
                        Invitez vos amis et gagnez <span className="text-accent font-bold">5€</span> pour chaque nouvelle commande passée via votre code !
                      </p>
                      <div className="mt-6 flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center text-accent">
                          <GiftIcon className="h-6 w-6" />
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-cream/40 leading-none mb-1">Vos crédits</p>
                          <p className="text-2xl font-black text-white">{(user as any).referralCredits || 0}€</p>
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 bg-white/10 rounded-2xl p-6 backdrop-blur-md border border-white/10">
                      <p className="text-[10px] font-black uppercase tracking-widest text-cream/60 mb-3 text-center">Votre code de parrainage</p>
                      <div className="flex items-center gap-2">
                        <code className="bg-white text-primary px-5 py-3 rounded-xl font-black tracking-widest text-lg">
                          {(user as any).referralCode || "---"}
                        </code>
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText((user as any).referralCode || "");
                            alert("Code copié !");
                          }}
                          className="h-12 w-12 rounded-xl bg-accent text-white flex items-center justify-center hover:scale-110 transition-transform shadow-glow"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"/></svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
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
  const { addItem } = useCart();
  const { addOrderReview } = useAuth();
  const router = useRouter();
  const [showReview, setShowReview] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");

  const handleReorder = () => {
    order.items.forEach(item => {
      addItem({
        id: (item as any).itemId || item.name,
        name: item.name,
        price: item.price,
        image: (item as any).image || "",
        flavor: (item as any).flavor
      }, item.quantity);
    });
    router.push("/panier");
  };

  const dateObj = new Date(order.createdAt);
  const formattedDate = dateObj.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="py-8 first:pt-0 last:pb-0 border-b border-cream/20 last:border-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="flex gap-5 min-w-0">
          <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl shadow-sm ${
            order.status === 'Livré' ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'
          }`}>
            {order.status === 'Livré' ? <GiftIcon className="h-8 w-8" /> : <ClockIcon className="h-8 w-8" />}
          </div>
          <div className="min-w-0 flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h4 className="font-display font-black text-primary text-lg tracking-tight truncate">
                #{order.id.substring(0, 8).toUpperCase()}
              </h4>
              <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                order.status === "Livré"
                  ? "bg-green-100 text-green-700"
                  : order.status === "En cours" || order.status === "Acompte Reçu"
                  ? "bg-blue-100 text-blue-700"
                  : "bg-primary/10 text-primary/60"
              }`}>
                {order.status}
              </span>
            </div>
            <p className="text-xs font-medium text-primary/40 uppercase tracking-widest">{formattedDate}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {order.status === 'Livré' && !order.hasReviewed && (
            <button 
              onClick={() => setShowReview(true)}
              className="btn btn-xs bg-accent/10 text-accent hover:bg-accent hover:text-white border-none px-4"
            >
              Donner mon avis (+1€)
            </button>
          )}
          <button 
            onClick={handleReorder}
            className="btn btn-xs bg-primary text-white hover:bg-primary/90 border-none px-4 flex items-center gap-2"
          >
            <CartIcon className="h-3 w-3" />
            Reprendre la même
          </button>
        </div>
      </div>

      <div className="mt-4 sm:ml-19 pl-1">
         <p className="text-xs font-medium text-primary/70 leading-relaxed italic border-l-2 border-cream/30 pl-3">
           {order.items.map(i => `${i.quantity}x ${i.name}`).join(", ")}
         </p>
      </div>

      <AnimatePresence>
        {showReview && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-6 p-6 rounded-3xl bg-creamSoft border border-cream/30 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-black text-primary uppercase tracking-[0.2em]">Votre note</p>
                <div className="flex gap-1.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button key={s} onClick={() => setRating(s)} className={`transition-all hover:scale-125 ${rating >= s ? 'text-accent' : 'text-primary/10'}`}>
                      <StarIcon className="h-7 w-7" />
                    </button>
                  ))}
                </div>
              </div>
              <textarea 
                placeholder="Un petit mot sur votre repas ?" 
                className="field bg-white min-h-[100px] text-sm"
                value={comment}
                onChange={e => setComment(e.target.value)}
              />
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setShowReview(false)} className="px-4 py-2 text-[10px] font-black text-primary/40 uppercase tracking-widest hover:text-primary transition-colors">Annuler</button>
                <button 
                  onClick={async () => {
                    await addOrderReview(order.id, rating, comment);
                    setShowReview(false);
                    alert("Merci ! 1€ a été ajouté à votre Afro Wallet.");
                  }} 
                  className="btn btn-sm btn-primary px-8 uppercase font-black tracking-widest"
                >
                  Envoyer
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function MonComptePage() {
  return (
    <Suspense fallback={
      <div className="container-x flex min-h-[40vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-cream border-t-accent" />
      </div>
    }>
      <MonCompteContent />
    </Suspense>
  );
}
