"use client";

import { useAuth, type Order, type MenuItemDynamic } from "@/components/AuthContext";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useMemo, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { GiftIcon, ArrowRightIcon, TrashIcon, ClockIcon, UserIcon, CartIcon, StarIcon } from "@/components/Icons";
import { formatPrice } from "@/lib/utils";
import dynamic from "next/dynamic";
import { MemberCard } from "@/components/MemberCard";
import { useCart } from "@/components/CartContext";
import { auth } from "@/lib/firebase";

const QRScannerModal = dynamic(
  () => import("@/components/QRScannerModal").then((mod) => mod.QRScannerModal),
  { ssr: false }
);

type Tab = "menu" | "orders" | "dashboard" | "profile";

function MonCompteContent() {
  const { user, loading, logout, deleteAccount, userOrders, dynamicMenu, updateProfile, confirmOrderDeletion } = useAuth();
  const { addItem, clearCart } = useCart();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Onglet par défaut ou depuis l'URL
  const [activeTab, setActiveTab] = useState<Tab>("menu");

  const [referrals, setReferrals] = useState<any[]>([]);
  const [isLoadingReferrals, setIsLoadingReferrals] = useState(false);

  useEffect(() => {
    if (activeTab !== "dashboard" || !auth.currentUser) return;
    
    let isMounted = true;
    const fetchReferrals = async () => {
      setIsLoadingReferrals(true);
      try {
        const token = await auth.currentUser!.getIdToken();
        const res = await fetch("/api/referrals", {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });
        if (res.ok) {
          const data = await res.json();
          if (isMounted) setReferrals(data.referrals || []);
        }
      } catch (err) {
        console.error("Failed to load referrals", err);
      } finally {
        if (isMounted) setIsLoadingReferrals(false);
      }
    };

    fetchReferrals();
    return () => {
      isMounted = false;
    };
  }, [activeTab]);

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
  const [showWalletDetails, setShowWalletDetails] = useState(false);
  const [cardTilt, setCardTilt] = useState({ x: 0, y: 0 });

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

                        {activeTab === "dashboard" && (() => {
              // Calculate wallet transactions dynamically
              const signupDate = user.createdAt?.toDate ? user.createdAt.toDate() : user.createdAt ? new Date(user.createdAt) : new Date();
              const transactions = [
                {
                  id: "welcome-credit",
                  type: "credit",
                  amount: 5.0,
                  description: "Offre de Bienvenue — Crédit initial",
                  createdAt: signupDate,
                }
              ];

              userOrders.forEach((order: any) => {
                if (order.discounts?.welcomeOffer || order.welcomeOffer) {
                  const date = order.createdAt ? new Date(order.createdAt) : new Date();
                  transactions.push({
                    id: `welcome-debit-${order.id}`,
                    type: "debit",
                    amount: 5.0,
                    description: `Offre de Bienvenue utilisée — Commande #${order.id.substring(0,8).toUpperCase()}`,
                    createdAt: date,
                  });
                }
                if (order.status === "Livré" && order.hasReviewed) {
                  const date = order.review?.createdAt?.toDate ? order.review.createdAt.toDate() : order.createdAt ? new Date(order.createdAt) : new Date();
                  transactions.push({
                    id: `review-credit-${order.id}`,
                    type: "credit",
                    amount: 1.0,
                    description: `Avis sur la commande #${order.id.substring(0,8).toUpperCase()}`,
                    createdAt: date,
                  });
                }
                if (order.discounts?.referralCredits > 0) {
                  const date = order.createdAt ? new Date(order.createdAt) : new Date();
                  transactions.push({
                    id: `wallet-spend-${order.id}`,
                    type: "debit",
                    amount: order.discounts.referralCredits,
                    description: `Utilisation Afro Wallet — Commande #${order.id.substring(0,8).toUpperCase()}`,
                    createdAt: date,
                  });
                }
              });

              // Sort by newest first
              transactions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

              const latestDeliveredOrder = userOrders.find(o => o.status === "Livré");

              const handleExpressReorder = () => {
                if (!latestDeliveredOrder) return;
                clearCart();
                latestDeliveredOrder.items.forEach((item: any) => {
                  addItem({
                    id: item.itemId || item.name,
                    name: item.name,
                    price: item.price,
                    image: item.image || "",
                    flavor: item.flavor
                  }, item.quantity);
                });
                router.push("/panier");
              };

              const handleMouseMove = (e: any) => {
                const card = e.currentTarget;
                const rect = card.getBoundingClientRect();
                const x = e.clientX - rect.left - rect.width / 2;
                const y = e.clientY - rect.top - rect.height / 2;
                const tiltX = (y / (rect.height / 2)) * -12;
                const tiltY = (x / (rect.width / 2)) * 12;
                setCardTilt({ x: tiltX, y: tiltY });
              };

              const handleMouseLeave = () => {
                setCardTilt({ x: 0, y: 0 });
              };

              return (
                <div className="space-y-8">
                  <div className="grid gap-6 lg:grid-cols-[1fr_360px] items-start">
                    
                    {/* -- GAUCHE : STATS & ACTIONS -- */}
                    <div className="space-y-6">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <StatCard title="Commandes" value={totalOrders} sub="Total passé" />
                        <StatCard title="Fidélité (Repas livrés)" value={deliveredOrders} sub={`${remaining} restants avant cadeau`} />
                      </div>

                      {/* 1-Click Express Reorder Widget */}
                      {latestDeliveredOrder && (
                        <div className="relative overflow-hidden rounded-3xl bg-white p-6 shadow-soft ring-1 ring-cream/20 border-l-4 border-accent animate-fade-in">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                              <span className="px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest bg-accent/10 text-accent">
                                Fast-Pass
                              </span>
                              <h3 className="font-display font-black text-primary text-base mt-2">Votre commande préférée vous manque ?</h3>
                              <p className="text-xs text-primary/50 mt-1">
                                Recommandez votre dernier repas du ${latestDeliveredOrder.createdAt ? new Date(latestDeliveredOrder.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }) : "récemment"} en un seul clic !
                              </p>
                              <p className="text-[10px] text-accent font-bold mt-2 truncate">
                                ${latestDeliveredOrder.items.map((i) => `${i.quantity}x ${i.name}`).join(", ")}
                              </p>
                            </div>
                            <button
                              onClick={handleExpressReorder}
                              className="btn btn-sm btn-primary shrink-0 px-6 uppercase font-black tracking-widest flex items-center gap-2"
                            >
                              <CartIcon className="h-3.5 w-3.5" />
                              1-Clic Express
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Parrainage card */}
                      <div className="rounded-3xl bg-primary-gradient p-6 text-cream shadow-soft relative overflow-hidden bg-grain">
                        <div className="afro-side-pattern absolute inset-0 opacity-10 pointer-events-none" />
                        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                          <div className="flex-1">
                            <h3 className="heading-display text-xl mb-1">Afro Family</h3>
                            <p className="text-xs text-cream/70 font-medium max-w-md">
                              Gagnez <span className="text-accentSoft font-bold">5€</span> pour chaque ami parrainé lors de sa première commande !
                            </p>
                          </div>

                          <div className="shrink-0 bg-white/10 rounded-2xl p-4 backdrop-blur-md border border-white/10">
                            <p className="text-[8px] font-black uppercase tracking-widest text-cream/60 mb-2 text-center">Votre code de parrainage</p>
                            <div className="flex items-center gap-2">
                              <code className="bg-white text-primary px-4 py-2 rounded-xl font-black tracking-widest text-sm">
                                {user.referralCode || "---"}
                              </code>
                              <button 
                                onClick={() => {
                                  navigator.clipboard.writeText(user.referralCode || "");
                                  alert("Code copié !");
                                }}
                                className="h-10 w-10 rounded-xl bg-accent text-white flex items-center justify-center hover:scale-105 transition-transform"
                              >
                                <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"/></svg>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Vos Parrainages Card */}
                      <div className="rounded-3xl bg-white p-6 shadow-soft ring-1 ring-cream/20">
                        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-primary/40 mb-4">Vos Parrainages</h3>
                        {isLoadingReferrals ? (
                          <div className="space-y-3">
                            <div className="h-12 bg-creamSoft animate-pulse rounded-2xl w-full" />
                            <div className="h-12 bg-creamSoft animate-pulse rounded-2xl w-full" />
                          </div>
                        ) : referrals.length > 0 ? (
                          <div className="grid gap-3 sm:grid-cols-2">
                            {referrals.map((ref, idx) => {
                              // Vague3-J: API now returns a coarse "joinedBucket"
                              // ("Il y a 3 mois") instead of an exact timestamp,
                              // to minimize PII surface to the referrer.
                              const when = ref.joinedBucket || "";
                              return (
                                <div key={idx} className="p-4 rounded-2xl bg-creamSoft/30 border border-cream/15 flex items-center justify-between">
                                  <div className="min-w-0">
                                    <p className="text-xs font-black text-primary truncate">{ref.name}</p>
                                    <p className="text-[9px] text-primary/40 font-bold mt-0.5">{when}</p>
                                  </div>
                                  <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider ${
                                    ref.hasContributed 
                                      ? "bg-emerald-100 text-emerald-700" 
                                      : "bg-primary/5 text-primary/40"
                                  }`}>
                                    {ref.hasContributed ? "Validé 🎉 (+5€)" : "Inscrit"}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-center py-6 text-primary/30 italic text-xs font-medium">
                            Aucun ami parrainé pour le moment. Partagez votre code pour commencer !
                          </p>
                        )}
                      </div>
                    </div>

                    {/* -- DROITE : APPLE CARD VIRTUAL WALLET -- */}
                    <div className="space-y-4 text-center sm:text-left">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/40 pl-1">Mon Mode de Paiement</p>
                      
                      <div 
                        onMouseMove={handleMouseMove}
                        onMouseLeave={handleMouseLeave}
                        onClick={() => setShowWalletDetails(true)}
                        style={{
                          transform: `perspective(1000px) rotateX(${cardTilt.x}deg) rotateY(${cardTilt.y}deg)`,
                          transition: "transform 0.1s ease-out, shadow 0.1s ease-out"
                        }}
                        className="relative aspect-[1.58/1] w-full rounded-[2rem] p-6 shadow-2xl ring-1 ring-white/20 overflow-hidden cursor-pointer hover:shadow-glow group select-none"
                      >
                        {/* Background metallic gradient with glowing layers */}
                        <div className="absolute inset-0 bg-gradient-to-br from-primary via-[#2E5E43] to-accent/90 opacity-95 transition-all duration-300 group-hover:scale-105" />
                        <div 
                          className="absolute inset-0 opacity-40 transition-opacity duration-300 group-hover:opacity-60 mix-blend-overlay"
                          style={{
                            background: `radial-gradient(circle at ${50 + cardTilt.y * 3}% ${50 - cardTilt.x * 3}%, rgba(255,255,255,0.4) 0%, transparent 60%)`
                          }}
                        />

                        {/* Top Line: Chip and Logo */}
                        <div className="relative z-10 flex items-center justify-between">
                          {/* Golden SIM Chip Graphic */}
                          <div className="h-8 w-11 rounded-lg bg-gradient-to-br from-yellow-200 via-yellow-400 to-yellow-600 p-0.5 opacity-80 shadow-md flex flex-col justify-between">
                            <div className="flex justify-between h-[30%] border-b border-yellow-700/20"><div className="w-[30%] border-r border-yellow-700/20"/><div className="w-[30%]"/></div>
                            <div className="flex justify-between h-[30%] border-b border-yellow-700/20"><div className="w-[30%] border-r border-yellow-700/20"/><div className="w-[30%]"/></div>
                            <div className="flex justify-between h-[30%]"><div className="w-[30%] border-r border-yellow-700/20"/><div className="w-[30%]"/></div>
                          </div>
                          
                          <span className="font-display font-black text-xs text-white/40 tracking-[0.25em] uppercase">Afro Card</span>
                        </div>

                        {/* Middle Line: Balance */}
                        <div className="relative z-10 mt-6 sm:mt-10">
                          <p className="text-[9px] font-black uppercase tracking-widest text-white/50 leading-none">Solde Disponible</p>
                          <h4 className="font-display text-3xl sm:text-4xl font-black text-white mt-2 leading-none drop-shadow-md">
                            ${((user).referralCredits || 0).toFixed(2)} €
                          </h4>
                        </div>

                        {/* Bottom Line: Cardholder & Exp */}
                        <div className="relative z-10 mt-auto flex items-end justify-between pt-6 sm:pt-10">
                          <div>
                            <p className="text-[8px] font-bold uppercase tracking-widest text-white/40 leading-none">Titulaire</p>
                            <p className="text-xs font-black text-white uppercase mt-1 leading-none truncate max-w-[180px]">{user.name}</p>
                          </div>
                          
                          <div className="shrink-0 flex flex-col items-end">
                            <span className="h-8 w-12 rounded-lg bg-white/10 backdrop-blur-sm border border-white/10 flex items-center justify-center text-[8px] font-black text-white uppercase tracking-widest hover:bg-white/20 transition-all">
                              Détails
                            </span>
                          </div>
                        </div>

                        {/* Reflected light sheen */}
                        <div className="absolute inset-0 w-[200%] h-full bg-gradient-to-r from-transparent via-white/10 to-transparent transform -skew-x-12 translate-x-[-150%] transition-transform duration-1000 group-hover:translate-x-[150%]" />
                      </div>
                      <p className="text-[10px] text-primary/40 font-bold italic text-center">💡 Cliquez sur la carte pour voir l&apos;historique de vos gains</p>
                    </div>
                  </div>

                  {/* -- WALLET TRANSACTION DRAWER (APPLE WALLET STYLE) -- */}
                  <AnimatePresence>
                    {showWalletDetails && (
                      <>
                        {/* Drawer Backdrop */}
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 0.5 }}
                          exit={{ opacity: 0 }}
                          onClick={() => setShowWalletDetails(false)}
                          className="fixed inset-0 z-[105] bg-black"
                        />

                        {/* Drawer Panel */}
                        <motion.div
                          initial={{ x: "100%" }}
                          animate={{ x: 0 }}
                          exit={{ x: "100%" }}
                          transition={{ type: "spring", damping: 30, stiffness: 300 }}
                          className="fixed right-0 top-0 bottom-0 z-[110] w-full sm:w-[460px] bg-creamSoft p-6 sm:p-8 shadow-2xl flex flex-col overflow-hidden"
                        >
                          {/* Close Button Header */}
                          <div className="flex items-center justify-between pb-6 border-b border-primary/10 shrink-0">
                            <div>
                              <h3 className="font-display font-black text-primary text-xl leading-tight">Historique Afro Wallet</h3>
                              <p className="text-[10px] font-bold text-accent uppercase tracking-widest mt-1">Vos transactions</p>
                            </div>
                            <button 
                              onClick={() => setShowWalletDetails(false)}
                              className="h-10 w-10 rounded-full bg-primary/5 hover:bg-primary/10 flex items-center justify-center text-primary transition-all"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
                            </button>
                          </div>

                          {/* Stat Mini Panel */}
                          <div className="mt-6 p-6 rounded-3xl bg-white shadow-sm ring-1 ring-cream/15 flex justify-between items-center shrink-0">
                            <div>
                              <p className="text-[9px] font-black text-primary/40 uppercase tracking-widest">Solde Actuel</p>
                              <p className="text-2xl font-black text-primary mt-1">${((user).referralCredits || 0).toFixed(2)} €</p>
                            </div>
                            <div className="h-12 w-12 rounded-2xl bg-green-50 text-green-600 flex items-center justify-center">
                              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
                            </div>
                          </div>

                          {/* List of transactions */}
                          <div className="flex-1 overflow-y-auto no-scrollbar py-6 space-y-4">
                            <p className="text-[9px] font-black text-primary/30 uppercase tracking-widest pl-1">Transactions récentes</p>
                            
                            {transactions.length > 0 ? (
                              <div className="space-y-3">
                                {transactions.map((tx, idx) => {
                                  const dateStr = tx.createdAt.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
                                  const timeStr = tx.createdAt.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
                                  return (
                                    <div key={tx.id || idx} className="bg-white p-4 rounded-2xl ring-1 ring-cream/10 shadow-sm flex items-center justify-between hover:scale-[1.01] transition-transform">
                                      <div className="min-w-0">
                                        <p className="text-xs font-bold text-primary truncate leading-tight">{tx.description}</p>
                                        <p className="text-[9px] text-primary/40 font-medium mt-1 uppercase tracking-widest">{dateStr} à {timeStr}</p>
                                      </div>
                                      
                                      <div className={`shrink-0 font-display font-black text-sm pl-4 ${
                                        tx.type === "credit" ? "text-green-600" : "text-primary/70"
                                      }`}>
                                        {tx.type === "credit" ? "+" : "-"}{tx.amount.toFixed(2)} €
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="text-center py-12">
                                <p className="text-primary/40 text-xs italic">Aucune transaction.</p>
                              </div>
                            )}
                          </div>
                          
                          {/* Footer */}
                          <div className="pt-4 border-t border-primary/10 shrink-0 text-center text-[9px] text-primary/40 font-medium">
                            Afro Wallet sécurisé par cryptage AES-256.
                          </div>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
              );
            })()}

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
  const { addOrderReview, isReviewRewardActive } = useAuth();
  const router = useRouter();
  const [showReview, setShowReview] = useState(false);
  const [reaction, setReaction] = useState<'bon' | 'moyen' | 'pas_bon'>('bon');
  const [reviewStatus, setReviewStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Auto-clear success message after 5 seconds
  useEffect(() => {
    if (reviewStatus === 'success') {
      const timer = setTimeout(() => setReviewStatus('idle'), 5000);
      return () => clearTimeout(timer);
    }
  }, [reviewStatus]);

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

  const dateObj = order.createdAt ? new Date(order.createdAt) : new Date();
  const formattedDate = mounted && !isNaN(dateObj.getTime()) 
    ? dateObj.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
    : "...";

  const orderIdDisplay = typeof order.id === "string" 
    ? `#${order.id.substring(0, 8).toUpperCase()}` 
    : `#${String(order.id).substring(0, 8).toUpperCase()}`;

  const handleSubmitReview = async () => {
    setReviewStatus('sending');
    try {
      await addOrderReview(order.id, reaction);
      setShowReview(false);
      setReviewStatus('success');
    } catch (err) {
      console.error(err);
      setReviewStatus('error');
    }
  };

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
                {orderIdDisplay}
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
          {order.status === 'Livré' && !order.hasReviewed && reviewStatus !== 'success' && (
            <button 
              onClick={() => setShowReview(true)}
              className="btn btn-xs bg-accent/10 text-accent hover:bg-accent hover:text-white border-none px-4"
            >
              Donner mon avis {isReviewRewardActive ? "(+1€)" : ""}
            </button>
          )}
          {["En cours", "En attente", "Acompte Reçu"].includes(order.status) && (
            <button 
              onClick={onScan}
              className="btn btn-xs bg-accent text-white hover:bg-accent/90 border-none px-4 flex items-center gap-1.5 shadow-glow"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
              Scanner pour valider
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

      {/* Dynamic tracking stepper */}
      <div className="mt-6 sm:ml-19 pl-1">
        <div className="rounded-2xl bg-creamSoft/30 border border-cream/15 p-5">
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-primary/30 mb-4">Suivi de commande en temps réel</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 relative">
            {/* Step 1: Acompte */}
            <div className="flex items-center gap-3">
              <div className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 text-sm font-black transition-all ${
                order.status === "Attente Acompte"
                  ? "bg-amber-500 text-white animate-pulse shadow-lg shadow-amber-200"
                  : "bg-emerald-500 text-white"
              }`}>
                {order.status === "Attente Acompte" ? "💳" : "✓"}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-black text-primary leading-tight">Acompte</p>
                <p className="text-[9px] text-primary/40 font-bold uppercase tracking-wider mt-0.5">
                  {order.status === "Attente Acompte" ? "À régler" : "Validé"}
                </p>
              </div>
            </div>

            {/* Step 2: Validée */}
            <div className="flex items-center gap-3">
              <div className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 text-sm font-black transition-all ${
                ["Acompte Reçu", "En attente"].includes(order.status)
                  ? "bg-accent text-white animate-pulse shadow-lg shadow-accent/20"
                  : ["En cours", "Livré"].includes(order.status)
                    ? "bg-emerald-500 text-white"
                    : "bg-primary/5 text-primary/30"
              }`}>
                {["En cours", "Livré"].includes(order.status) ? "✓" : "🍳"}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-black text-primary leading-tight">Confirmée</p>
                <p className="text-[9px] text-primary/40 font-bold uppercase tracking-wider mt-0.5">
                  {["Acompte Reçu", "En attente"].includes(order.status)
                    ? "Reçue"
                    : ["En cours", "Livré"].includes(order.status)
                      ? "Validée"
                      : "En attente"}
                </p>
              </div>
            </div>

            {/* Step 3: En cuisine */}
            <div className="flex items-center gap-3">
              <div className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 text-sm font-black transition-all ${
                order.status === "En cours"
                  ? "bg-amber-500 text-white animate-pulse shadow-lg shadow-amber-200"
                  : order.status === "Livré"
                    ? "bg-emerald-500 text-white"
                    : "bg-primary/5 text-primary/30"
              }`}>
                {order.status === "Livré" ? "✓" : "🧑‍🍳"}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-black text-primary leading-tight">En cuisine</p>
                <p className="text-[9px] text-primary/40 font-bold uppercase tracking-wider mt-0.5">
                  {order.status === "En cours"
                    ? "Préparation"
                    : order.status === "Livré"
                      ? "Prêt"
                      : "À venir"}
                </p>
              </div>
            </div>

            {/* Step 4: Livré */}
            <div className="flex items-center gap-3">
              <div className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 text-sm font-black transition-all ${
                order.status === "Livré"
                  ? "bg-emerald-500 text-white shadow-lg shadow-emerald-200"
                  : "bg-primary/5 text-primary/30"
              }`}>
                😋
              </div>
              <div className="min-w-0">
                <p className="text-xs font-black text-primary leading-tight">Livrée</p>
                <p className="text-[9px] text-primary/40 font-bold uppercase tracking-wider mt-0.5">
                  {order.status === "Livré" ? "Dégusté" : "Livraison"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Toast de feedback review */}
      <AnimatePresence>
        {reviewStatus === 'success' && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-4 p-4 rounded-2xl bg-green-50 border border-green-200 flex items-center gap-3"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-600">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"/></svg>
            </div>
            <p className="text-sm font-bold text-green-700">
              {isReviewRewardActive
                ? "Merci pour votre avis ! 1€ sera ajouté à votre Afro Wallet."
                : "Merci pour votre avis ! Votre retour est précieux pour nous."}
            </p>
          </motion.div>
        )}
        {reviewStatus === 'error' && !showReview && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-4 p-4 rounded-2xl bg-red-50 border border-red-200 flex items-center gap-3"
          >
            <p className="text-sm font-bold text-red-600">
              Une erreur est survenue. Votre avis a peut-être déjà été enregistré, rechargez la page.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showReview && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-6 p-6 rounded-3xl bg-creamSoft border border-cream/30 space-y-4">
              <div className="flex flex-col gap-3">
                <p className="text-xs font-black text-primary uppercase tracking-[0.2em] text-center sm:text-left">
                  Qu&apos;avez-vous pensé de votre repas ?
                </p>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'bon', label: 'Bon 😋', activeStyle: 'bg-emerald-500 text-white border-emerald-500 shadow-emerald-200' },
                    { id: 'moyen', label: 'Moyen 😐', activeStyle: 'bg-amber-500 text-white border-amber-500 shadow-amber-200' },
                    { id: 'pas_bon', label: 'Pas bon 😞', activeStyle: 'bg-red-500 text-white border-red-500 shadow-red-200' }
                  ].map((r) => {
                    const isActive = reaction === r.id;
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => setReaction(r.id as any)}
                        className={`py-4 rounded-2xl text-xs sm:text-sm font-black transition-all border shadow-sm flex flex-col items-center justify-center gap-1 active:scale-95 ${
                          isActive
                            ? r.activeStyle + ' shadow-lg scale-105'
                            : 'bg-white text-primary/60 border-cream/20 hover:bg-cream hover:text-primary'
                        }`}
                      >
                        {r.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Error inline dans le form */}
              {reviewStatus === 'error' && (
                <p className="text-xs font-bold text-red-500 bg-red-50 p-3 rounded-xl">
                  ⚠ Erreur lors de l&apos;envoi. Vérifiez votre connexion et réessayez.
                </p>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button 
                  onClick={() => { setShowReview(false); setReviewStatus('idle'); }} 
                  disabled={reviewStatus === 'sending'}
                  className="px-4 py-2 text-[10px] font-black text-primary/40 uppercase tracking-widest hover:text-primary transition-colors"
                >
                  Annuler
                </button>
                <button 
                  onClick={handleSubmitReview}
                  disabled={reviewStatus === 'sending'}
                  className="btn btn-sm btn-primary px-8 uppercase font-black tracking-widest flex items-center gap-2"
                >
                  {reviewStatus === 'sending' ? (
                    <>
                      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Envoi...
                    </>
                  ) : (
                    "Envoyer"
                  )}
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
