"use client";

import { useAuth, type Order, type OrderStatus } from "@/components/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { GiftIcon, CheckIcon, ClockIcon, MailIcon, PlusIcon, UserIcon, CartIcon, TrashIcon } from "@/components/Icons";
import { AdminMenuManager } from "@/components/AdminMenuManager";
import { QRCodeSVG } from "qrcode.react";

import { db } from "@/lib/firebase";
type Tab = "overview" | "orders" | "customers" | "newsletter" | "menu" | "promotions";

// Modal QR Code
function QRModal({ orderId, onClose }: { orderId: string; onClose: () => void }) {
  // Hardcoded canonical origin: window.location.origin would let a host-header
  // injection / cache poisoning poison the QR target.
  const CANONICAL_ORIGIN = "https://afromiaam.com";
  const validationUrl = `${CANONICAL_ORIGIN}/valider-commande/${orderId}`;
  
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-primary/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-3xl bg-white p-8 text-center shadow-2xl animate-fade-in">
        <h3 className="heading-display mb-6 text-2xl text-primary">QR de Livraison</h3>
        <div className="mx-auto flex aspect-square w-full max-w-[200px] items-center justify-center rounded-2xl bg-creamSoft p-4 mb-6 ring-1 ring-black/5">
          <QRCodeSVG value={validationUrl} size={180} />
        </div>
        <p className="text-xs text-primary/60 font-medium mb-8">
          Présentez ce QR Code au client pour qu&apos;il valide la réception sur son téléphone.
        </p>
        <button onClick={onClose} className="btn btn-primary w-full">Fermer</button>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const { 
    user, 
    loading, 
    logout, 
    allOrders, 
    allCustomers, 
    newsletterSubscribers,
    updateOrderStatus,
    isReviewRewardActive,
    isWelcomeOfferActive,
    updateGlobalSettings,
    dynamicMenu,
    updateMenuItem,
  } = useAuth();

  // Séparation des commandes (scope declared early for KDS and BI charts)
  const depositPendingOrders = allOrders.filter(o => o.status === "Attente Acompte");
  const activeOrders = allOrders.filter(o => o.status === "En attente" || o.status === "En cours" || o.status === "Acompte Reçu");
  const historyOrders = allOrders.filter(o => o.status === "Livré");
  
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [selectedOrderForQR, setSelectedOrderForQR] = useState<string | null>(null);

  // Promotions State & CRUD Handlers
  const [promotions, setPromotions] = useState<Record<string, { code: string; discountType: "percentage" | "fixed"; discountValue: number; isActive: boolean }>>({});
  const [promoForm, setPromoForm] = useState({ code: "", discountType: "percentage" as "percentage" | "fixed", discountValue: 0, isActive: true });
  const [isLoadingPromos, setIsLoadingPromos] = useState(false);

  // KDS Mode & Audio Alert State
  const [isKdsMode, setIsKdsMode] = useState(false);
  const [lastOrdersCount, setLastOrdersCount] = useState(0);

  useEffect(() => {
    const activeCount = activeOrders.length;
    if (activeCount > lastOrdersCount && lastOrdersCount > 0) {
      // Play audio notification chime for new order
      const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-120.wav");
      audio.play().catch(() => {});
    }
    setLastOrdersCount(activeCount);
  }, [activeOrders.length]);

  useEffect(() => {
    if (activeTab === "promotions") {
      const loadPromotions = async () => {
        setIsLoadingPromos(true);
        try {
          const { doc, getDoc } = await import("firebase/firestore");
          const snap = await getDoc(doc(db, "settings", "promotions"));
          if (snap.exists()) {
            setPromotions(snap.data().codes || {});
          }
        } catch (err) {
          console.error("Error loading promotions:", err);
        } finally {
          setIsLoadingPromos(false);
        }
      };
      loadPromotions();
    }
  }, [activeTab]);

  const handleSavePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoForm.code.trim() || promoForm.discountValue <= 0) return;
    
    const codeKey = promoForm.code.toUpperCase().trim();
    const updatedCodes = {
      ...promotions,
      [codeKey]: {
        code: codeKey,
        discountType: promoForm.discountType,
        discountValue: promoForm.discountValue,
        isActive: promoForm.isActive
      }
    };

    try {
      const { doc, setDoc } = await import("firebase/firestore");
      await setDoc(doc(db, "settings", "promotions"), { codes: updatedCodes });
      setPromotions(updatedCodes);
      setPromoForm({ code: "", discountType: "percentage", discountValue: 0, isActive: true });
    } catch (err) {
      alert("Erreur lors de la sauvegarde.");
    }
  };

  const handleDeletePromo = async (codeKey: string) => {
    if (!confirm("Voulez-vous supprimer ce code promo ?")) return;
    const { [codeKey]: _, ...updatedCodes } = promotions;
    try {
      const { doc, setDoc } = await import("firebase/firestore");
      await setDoc(doc(db, "settings", "promotions"), { codes: updatedCodes });
      setPromotions(updatedCodes);
    } catch (err) {
      alert("Erreur lors de la suppression.");
    }
  };

  const handleTogglePromoStatus = async (codeKey: string) => {
    const updatedCodes = {
      ...promotions,
      [codeKey]: {
        ...promotions[codeKey],
        isActive: !promotions[codeKey].isActive
      }
    };
    try {
      const { doc, setDoc } = await import("firebase/firestore");
      await setDoc(doc(db, "settings", "promotions"), { codes: updatedCodes });
      setPromotions(updatedCodes);
    } catch (err) {
      alert("Erreur lors de la mise à jour.");
    }
  };

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    } else if (!loading && user && user.role !== "admin") {
      router.push("/mon-compte");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="container-x flex min-h-[40vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-cream border-t-accent" />
      </div>
    );
  }

  if (!user || user.role !== "admin") return null;

  if (isKdsMode) {
    return (
      <div className="fixed inset-0 z-[200] bg-[#0c0c0c] text-white flex flex-col font-sans select-none overflow-hidden">
        {/* KDS Header */}
        <header className="bg-black/40 border-b border-white/5 px-8 py-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <span className="text-2xl">📟</span>
            <div>
              <h1 className="font-display font-black text-lg tracking-widest text-accent uppercase">KITCHEN DISPLAY SYSTEM</h1>
              <p className="text-[10px] text-white/45 font-bold uppercase tracking-wider mt-0.5">Afro Miaam Cookroom</p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right">
              <span className="text-xl font-bold font-mono text-accentSoft">Cuisine</span>
              <p className="text-[9px] text-white/30 uppercase tracking-widest font-bold mt-0.5">Lyon Kitchen</p>
            </div>
            <button
              onClick={() => setIsKdsMode(false)}
              className="btn btn-sm bg-white/10 hover:bg-white/20 text-white font-black px-6 uppercase tracking-wider h-11 rounded-xl"
            >
              Quitter KDS
            </button>
          </div>
        </header>

        {/* KDS Grid */}
        <main className="flex-1 overflow-x-auto p-8 flex gap-6 align-stretch items-stretch no-scrollbar">
          {activeOrders.map(order => {
            const timeDiff = Math.round((new Date().getTime() - new Date(order.createdAt).getTime()) / 60000) || 0;
            return (
              <div
                key={order.id}
                className="w-[320px] shrink-0 bg-black/60 border border-white/10 rounded-3xl p-6 flex flex-col justify-between ring-1 ring-white/5 shadow-2xl relative overflow-hidden"
              >
                {timeDiff > 20 && (
                  <div className="absolute top-0 inset-x-0 h-1 bg-red-500 animate-pulse" />
                )}
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="text-[10px] text-white/40 font-black uppercase tracking-widest">Commande</p>
                      <h3 className="font-display font-black text-xl text-white mt-0.5">#{order.id.substring(0, 8).toUpperCase()}</h3>
                    </div>
                    <span className={"px-2.5 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest " + (timeDiff > 20 ? 'bg-red-500/20 text-red-400 animate-pulse' : 'bg-accent/20 text-accent')}>
                      ⏱ {timeDiff} min
                    </span>
                  </div>

                  <p className="text-xs font-bold text-accentSoft mb-4 truncate uppercase tracking-wide">👨‍🍳 {order.userName}</p>

                  <div className="border-t border-white/5 pt-4 space-y-3">
                    {order.items.map((item: any, idx) => (
                      <div key={idx} className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          className="h-5 w-5 rounded-lg border-white/10 bg-white/5 text-accent focus:ring-accent accent-accent mt-0.5 cursor-pointer shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-black text-white/90 leading-tight">
                            {item.quantity}x {item.name}
                          </p>
                          {item.flavor && (
                            <p className="text-[10px] text-accentSoft font-bold uppercase tracking-wider mt-0.5">
                              {item.flavor}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-white/5">
                  {order.status === "En attente" ? (
                    <button
                      onClick={() => handleStatusChange(order.id, "En cours")}
                      className="w-full btn btn-md bg-accent text-white font-black py-4 rounded-2xl uppercase tracking-wider shadow-glow hover:scale-[1.02] transition-transform"
                    >
                      🍳 Commencer
                    </button>
                  ) : (
                    <button
                      onClick={() => handleStatusChange(order.id, "Livré")}
                      className="w-full btn btn-md bg-white text-black font-black py-4 rounded-2xl uppercase tracking-wider hover:scale-[1.02] transition-transform"
                    >
                      ✅ Servie & Livrée
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          {activeOrders.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center text-center max-w-xl mx-auto">
              <span className="text-6xl mb-6 animate-bounce">🍳</span>
              <h2 className="font-display font-black text-2xl tracking-widest uppercase">Cuisine Propre</h2>
              <p className="text-sm text-white/40 mt-2 font-medium">Aucune commande en attente de préparation pour le moment.</p>
            </div>
          )}
        </main>
      </div>
    );
  }

  const maxOrders = 10;

  // Category popularity aggregation for SVG charts
  const categoryCounts = allOrders.reduce((acc, o) => {
    (o.items || []).forEach(item => {
      // Find category if possible or default to signature
      const matched = dynamicMenu.find(m => m.name === item.name);
      const cat = matched ? matched.category : "signature";
      acc[cat] = (acc[cat] || 0) + item.quantity;
    });
    return acc;
  }, {} as Record<string, number>);
  
  const maxCatCount = Math.max(...Object.values(categoryCounts), 1);

  // Calculs statistiques
  const totalRevenue = allOrders.reduce((acc, o) => acc + o.total, 0);
  const totalOrdersCount = allOrders.length;
  
  // Statistiques mensuelles
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const currentMonthOrders = allOrders.filter(o => {
    const d = new Date(o.createdAt);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });
  const currentMonthRevenue = currentMonthOrders.reduce((acc, o) => acc + o.total, 0);

  // Groupement par mois pour les tendances
  const monthlyData = allOrders.reduce((acc, o) => {
    const d = new Date(o.createdAt);
    const month = d.toLocaleString('fr-FR', { month: 'long', year: 'numeric' });
    if (!acc[month]) acc[month] = { revenue: 0, count: 0 };
    acc[month].revenue += o.total;
    acc[month].count += 1;
    return acc;
  }, {} as Record<string, { revenue: number; count: number }>);

  const monthlyDataArray = Object.entries(monthlyData).map(([month, data]) => ({ month, ...data }));

  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    try {
      await updateOrderStatus(orderId, newStatus);
    } catch (err) {
      console.error("Erreur mise à jour statut:", err);
    }
  };

  // --- Fonctions Export ---
  const exportNewsletterCSV = () => {
    if (newsletterSubscribers.length === 0) return;
    
    const headers = ["Email", "Date d'inscription", "Source"];
    const rows = newsletterSubscribers.map(sub => [
      sub.email,
      sub.createdAt,
      sub.source
    ]);
    
    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.join(","))
    ].join("\n");
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `newsletter_afro_miaam_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const copyAllEmails = () => {
    const emails = newsletterSubscribers.map(s => s.email).join(", ");
    navigator.clipboard.writeText(emails);
    alert("Tous les emails ont été copiés !");
  };

  return (
    <div className="container-x py-10 sm:py-20 max-w-full overflow-hidden">
      {/* Header Admin */}
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between border-b border-cream/20 pb-10">
        <div>
          <h1 className="heading-display text-3xl text-primary sm:text-5xl leading-tight">
            Panel <span className="text-accent">Administrateur</span>
          </h1>
          <p className="mt-2 text-primary/60 font-medium italic">Tableau de bord : {user.name}</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={() => setIsKdsMode(true)}
            className="btn btn-md bg-accent text-white px-6 shadow-glow"
          >
            📟 Mode Cuisine (KDS)
          </button>
          <button
            onClick={async () => {
              await logout();
              router.push("/login");
            }}
            className="btn btn-md bg-afro-red text-white px-8 shadow-md"
          >
            Se déconnecter
          </button>
        </div>
      </div>

      {/* Navigation Onglets */}
      <div className="mt-10 flex flex-wrap border-b border-cream/30 gap-1 sm:gap-6 overflow-x-auto no-scrollbar scroll-smooth">
        <TabButton id="overview" active={activeTab === "overview"} onClick={setActiveTab} label="Vue d'ensemble" />
        <TabButton id="orders" active={activeTab === "orders"} onClick={setActiveTab} label={`Commandes (${activeOrders.length})`} />
        <TabButton id="customers" active={activeTab === "customers"} onClick={setActiveTab} label="Clients & Fidélité" />
        <TabButton id="newsletter" active={activeTab === "newsletter"} onClick={setActiveTab} label="Newsletter" />
        <TabButton id="menu" active={activeTab === "menu"} onClick={setActiveTab} label="La Carte" />
        <TabButton id="promotions" active={activeTab === "promotions"} onClick={setActiveTab} label="Codes Promos" />
      </div>

      <div className="mt-10">
        {selectedOrderForQR && (
          <QRModal orderId={selectedOrderForQR} onClose={() => setSelectedOrderForQR(null)} />
        )}
        {/* --- ONGLET : VUE D'ENSEMBLE --- */}
        {activeTab === "overview" && (
          <div className="space-y-12 animate-fade-in">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <KPI 
                title="Chiffre d'Affaires" 
                value={`${totalRevenue.toFixed(2)} €`} 
                sub="Total cumulé en ligne"
                variant="primary"
              />
              <KPI 
                title="Commandes" 
                value={totalOrdersCount.toString()} 
                sub="Objectif : 500"
                progress={(totalOrdersCount / 500) * 100}
              />
              <KPI 
                title="Ce Mois-ci" 
                value={`${currentMonthRevenue.toFixed(2)} €`} 
                sub={`${currentMonthOrders.length} nouvelles commandes`}
                trend="up"
              />
            </div>

            <div className="grid gap-8 lg:grid-cols-2">
              {/* Sales Trend Chart (Pure SVG Line Graph) */}
              <div className="rounded-3xl bg-white p-8 shadow-card ring-1 ring-cream/10 flex flex-col justify-between">
                <div>
                  <h3 className="heading-display text-xl text-primary mb-2">Tendance des Ventes</h3>
                  <p className="text-xs text-primary/45 font-bold uppercase tracking-wider mb-6">Chiffre d'Affaires Récent (7 Commandes)</p>
                </div>
                
                <div className="w-full relative h-[180px]">
                  <svg className="w-full h-full overflow-visible" viewBox="0 0 400 180">
                    <defs>
                      <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#ff7d1a" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#ff7d1a" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    
                    {/* Horizontal Grid lines */}
                    <line x1="30" y1="30" x2="370" y2="30" stroke="#f1f1ee" strokeDasharray="4 4" />
                    <line x1="30" y1="80" x2="370" y2="80" stroke="#f1f1ee" strokeDasharray="4 4" />
                    <line x1="30" y1="130" x2="370" y2="130" stroke="#f1f1ee" strokeDasharray="4 4" />
                    
                    {/* Render Area & Trend Line */}
                    {(() => {
                      const recentList = [...allOrders].slice(0, 7).reverse();
                      if (recentList.length < 2) return null;
                      const maxVal = Math.max(...recentList.map(o => o.total), 50);
                      const points = recentList.map((o, idx) => {
                        const x = 30 + (idx * (340 / (recentList.length - 1)));
                        const y = 150 - (o.total / maxVal) * 110;
                        return { x, y, total: o.total };
                      });
                      
                      const pathData = points.reduce((acc, p, idx) => {
                        return acc + (idx === 0 ? "M " : " L ") + p.x + " " + p.y;
                      }, "");
                      
                      const areaData = pathData + " L " + points[points.length - 1].x + " 150 L " + points[0].x + " 150 Z";
                      
                      return (
                        <>
                          <path d={areaData} fill="url(#salesGrad)" />
                          <path d={pathData} fill="none" stroke="#ff7d1a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                          {points.map((p, idx) => (
                            <g key={idx} className="group/dot cursor-pointer">
                              <circle cx={p.x} cy={p.y} r="5" fill="#ffffff" stroke="#ff7d1a" strokeWidth="3" className="transition-all duration-300 group-hover/dot:r-7" />
                              <title>{p.total.toFixed(2)} €</title>
                            </g>
                          ))}
                        </>
                      );
                    })()}
                  </svg>
                </div>
              </div>

              {/* Category Popularity (Pure SVG Bar Chart) */}
              <div className="rounded-3xl bg-white p-8 shadow-card ring-1 ring-cream/10 flex flex-col justify-between">
                <div>
                  <h3 className="heading-display text-xl text-primary mb-2">Popularité par Catégorie</h3>
                  <p className="text-xs text-primary/45 font-bold uppercase tracking-wider mb-6">Volumes de Commandes par Type de Plat</p>
                </div>

                <div className="space-y-5">
                  {Object.entries({
                    signature: "Plats Signatures",
                    accompagnement: "Accompagnements",
                    boisson: "Boissons",
                    dessert: "Desserts"
                  }).map(([key, label], idx) => {
                    const count = categoryCounts[key] || 0;
                    const pct = Math.min((count / maxCatCount) * 100, 100);
                    const color = key === 'signature' ? '#ff7d1a' : key === 'accompagnement' ? '#1aa05f' : key === 'boisson' ? '#2563eb' : '#db2777';
                    return (
                      <div key={key} className="space-y-2">
                        <div className="flex justify-between items-center text-xs font-black uppercase tracking-wider">
                          <span className="text-primary/60">{label}</span>
                          <span className="text-primary">{count} plats</span>
                        </div>
                        <div className="h-3 w-full bg-creamSoft rounded-full overflow-hidden relative">
                          <div className="h-full rounded-full transition-all duration-1000" style={{ width: pct + "%", backgroundColor: color }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* --- PARAMÈTRES PROMOTIONS --- */}
            <div className="rounded-3xl bg-white p-8 shadow-card ring-1 ring-cream/10">
              <h3 className="heading-display mb-6 text-xl text-primary">Paramètres Promotions</h3>
              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 rounded-2xl bg-creamSoft/50 border border-cream/20">
                  <div>
                    <p className="text-sm font-bold text-primary">Bonus +1€ pour avis client</p>
                    <p className="text-[10px] text-primary/40 mt-1">Les clients reçoivent 1€ en Afro Wallet après chaque avis sur une commande livrée.</p>
                  </div>
                  <button
                    onClick={() => updateGlobalSettings({ isReviewRewardActive: !isReviewRewardActive })}
                    className={`relative inline-flex h-8 w-14 shrink-0 cursor-pointer rounded-full transition-colors duration-300 ${
                      isReviewRewardActive ? 'bg-accent' : 'bg-primary/20'
                    }`}
                  >
                    <span className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-md transition-transform duration-300 mt-1 ${
                      isReviewRewardActive ? 'translate-x-7' : 'translate-x-1'
                    }`} />
                  </button>
                </div>
                <div className="flex items-center justify-between p-4 rounded-2xl bg-creamSoft/50 border border-cream/20">
                  <div>
                    <p className="text-sm font-bold text-primary">Offre de bienvenue (-5€)</p>
                    <p className="text-[10px] text-primary/40 mt-1">Les nouveaux clients bénéficient de 5€ de réduction sur leur première commande.</p>
                  </div>
                  <button
                    onClick={() => updateGlobalSettings({ isWelcomeOfferActive: !isWelcomeOfferActive })}
                    className={`relative inline-flex h-8 w-14 shrink-0 cursor-pointer rounded-full transition-colors duration-300 ${
                      isWelcomeOfferActive ? 'bg-accent' : 'bg-primary/20'
                    }`}
                  >
                    <span className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-md transition-transform duration-300 mt-1 ${
                      isWelcomeOfferActive ? 'translate-x-7' : 'translate-x-1'
                    }`} />
                  </button>
                </div>
              </div>
            </div>

            {/* --- RUPTURE DE STOCK D'URGENCE --- */}
            <div className="rounded-3xl bg-white p-8 shadow-card ring-1 ring-cream/10 mt-8">
              <h3 className="heading-display mb-6 text-xl text-primary">Rupture de Stock d'Urgence (1-Clic)</h3>
              <p className="text-xs text-primary/50 mb-6 italic">Activez ou désactivez instantanément la disponibilité des plats phares en cuisine en plein rush.</p>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {dynamicMenu.slice(0, 6).map(item => (
                  <div key={item.id} className="flex items-center justify-between p-4 rounded-2xl bg-creamSoft/50 border border-cream/20">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-xl bg-cream">
                        <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-primary truncate">{item.name}</p>
                        <p className="text-[9px] text-primary/45 uppercase tracking-wider mt-0.5">{item.available ? "Disponible" : "Épuisé"}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => updateMenuItem(item.id, { available: !item.available })}
                      className={"relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full transition-colors duration-300 " + (item.available ? 'bg-green-500' : 'bg-red-500')}
                    >
                      <span className={"inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-300 mt-1 " + (item.available ? 'translate-x-6' : 'translate-x-1')} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* --- ONGLET : COMMANDES --- */}
        {activeTab === "orders" && (
          <div className="space-y-12 animate-fade-in">
             <div className="grid gap-10 xl:grid-cols-[1fr_350px]">
                <div className="space-y-10">
                  <div>
                    <h2 className="heading-display mb-6 text-2xl text-accent">Attente Acompte ({depositPendingOrders.length})</h2>
                    <div className="rounded-3xl bg-white shadow-card ring-1 ring-accent/10 overflow-hidden divide-y divide-cream/10 mb-10">
                      {depositPendingOrders.map(order => (
                        <OrderRow key={order.id} order={order} onStatusChange={handleStatusChange} onShowQR={setSelectedOrderForQR} />
                      ))}
                      {depositPendingOrders.length === 0 && <p className="p-10 text-center text-primary/30 italic font-medium">Aucun acompte en attente.</p>}
                    </div>

                    <h2 className="heading-display mb-6 text-2xl text-primary">Prêtes à cuisiner / En cours ({activeOrders.length})</h2>
                    <div className="rounded-3xl bg-white shadow-card ring-1 ring-cream/10 overflow-hidden divide-y divide-cream/10">
                      {activeOrders.map(order => (
                        <OrderRow key={order.id} order={order} onStatusChange={handleStatusChange} onShowQR={setSelectedOrderForQR} />
                      ))}
                      {activeOrders.length === 0 && <p className="p-16 text-center text-primary/30 italic font-medium">Aucune commande à traiter pour le moment.</p>}
                    </div>
                  </div>
                </div>
                
                <aside className="space-y-8">
                  <div className="rounded-3xl bg-creamSoft/50 p-6 border border-cream/20">
                    <h3 className="text-xs font-black uppercase tracking-widest text-primary/50 mb-6">Historique Récent</h3>
                    <div className="space-y-6">
                       {historyOrders.slice(0, 10).map(order => (
                         <div key={order.id} className="flex justify-between items-start group">
                           <div className="min-w-0">
                             <p className="text-xs font-black text-primary truncate uppercase">{order.userName}</p>
                             <p className="text-[9px] text-primary/40">{order.createdAt}</p>
                           </div>
                           <p className="text-xs font-bold text-primary shrink-0">{order.total.toFixed(2)} €</p>
                         </div>
                       ))}
                    </div>
                  </div>
                </aside>
             </div>
          </div>
        )}

        {/* --- ONGLET : CLIENTS --- */}
        {activeTab === "customers" && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 animate-fade-in">
            {allCustomers.map(customer => {
              const currentInCycle = customer.ordersCount % maxOrders;
              const percentage = Math.min((currentInCycle / maxOrders) * 100, 100);
              const isEligible = customer.ordersCount > 0 && currentInCycle === 0;
              const isNew = (customer as any).isFirstLogin === true;
              const hasUsedWelcome = (customer as any).hasUsedWelcomeOffer === true;
              const createdAt = (customer as any).createdAt;
              const createdDate = createdAt?.toDate ? createdAt.toDate().toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : createdAt ? new Date(createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : null;
              return (
                <div key={customer.id} className="rounded-3xl bg-white p-8 shadow-card ring-1 ring-cream/10 flex flex-col justify-between hover:scale-[1.02] transition-transform">
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <div className="h-12 w-12 rounded-2xl bg-primary/5 flex items-center justify-center text-primary">
                        <UserIcon className="h-6 w-6" />
                      </div>
                      <div className="flex items-center gap-2">
                        {isNew && (
                          <span className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-blue-100 text-blue-600 animate-pulse">
                            🆕 Nouveau
                          </span>
                        )}
                        {isEligible && <GiftIcon className="h-8 w-8 text-accent animate-bounce shadow-glow" />}
                      </div>
                    </div>
                    <h3 className="font-display font-black text-primary text-lg truncate">{customer.name}</h3>
                    <p className="text-xs text-primary/40 truncate">{customer.email}</p>
                    <p className="text-xs font-black text-accent mt-2 tracking-widest">{customer.phone || "---"}</p>
                    {createdDate && (
                      <p className="text-[9px] text-primary/30 mt-1">Inscrit le {createdDate}</p>
                    )}
                  </div>
                  
                  <div className="mt-6 space-y-3">
                    {/* Badge offre bienvenue */}
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[9px] font-black uppercase tracking-widest ${
                        hasUsedWelcome
                          ? 'bg-gray-100 text-primary/40'
                          : 'bg-accent/10 text-accent'
                      }`}>
                        🎁 {hasUsedWelcome ? 'Bienvenue utilisée' : 'Bienvenue disponible'}
                      </span>
                    </div>

                    <div className="pt-3 border-t border-cream/10">
                      <div className="flex justify-between text-[10px] font-black uppercase tracking-widest mb-2">
                        <span className="text-primary/60">Fidélité</span>
                        <span className="text-accent">{currentInCycle} / 10</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-creamSoft overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-1000 ${isEligible ? 'bg-accent' : 'bg-primary'}`} style={{ width: `${percentage}%` }} />
                      </div>
                      <p className="mt-2 text-[9px] text-primary/40 italic">Total commandes : {customer.ordersCount}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* --- ONGLET : NEWSLETTER --- */}
        {activeTab === "newsletter" && (
          <div className="space-y-8 animate-fade-in">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between bg-white p-8 rounded-3xl shadow-card ring-1 ring-cream/10">
              <div>
                <h2 className="heading-display text-2xl text-primary">Marketing & Audience</h2>
                <p className="text-sm text-primary/50 mt-1 italic">{newsletterSubscribers.length} inscrits actifs.</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button onClick={copyAllEmails} className="btn btn-sm bg-creamSoft text-primary border border-cream/20 px-6">
                  Copier Emails
                </button>
                <button onClick={exportNewsletterCSV} className="btn btn-sm bg-primary text-white px-6">
                  Exporter CSV
                </button>
                <a 
                  href="https://www.mailerlite.com/" 
                  target="_blank" 
                  rel="noreferrer" 
                  className="btn btn-sm bg-accent text-white px-6 shadow-glow"
                >
                  MailerLite
                </a>
              </div>
            </div>

            <div className="overflow-hidden rounded-3xl bg-white shadow-card ring-1 ring-cream/10">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[600px]">
                  <thead className="bg-creamSoft/50 text-primary text-[10px] font-black uppercase tracking-[0.2em]">
                    <tr>
                      <th className="px-8 py-5">Contact</th>
                      <th className="px-8 py-5">Inscription</th>
                      <th className="px-8 py-5">Source</th>
                      <th className="px-8 py-5">Alerte</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-cream/10">
                    {newsletterSubscribers.map(sub => {
                      const isNew = (new Date().getTime() - new Date(sub.createdAt).getTime()) < (7 * 24 * 60 * 60 * 1000);
                      return (
                        <tr key={sub.id} className="text-sm hover:bg-cream/5 transition-colors">
                          <td className="px-8 py-5 font-bold text-primary">{sub.email}</td>
                          <td className="px-8 py-5 text-primary/60">{sub.createdAt}</td>
                          <td className="px-8 py-5">
                            <span className={`inline-flex rounded-lg px-3 py-1 text-[9px] font-black uppercase tracking-widest ${
                              sub.source === 'inscription' ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-green-600'
                            }`}>
                              {sub.source}
                            </span>
                          </td>
                          <td className="px-8 py-5">
                            {isNew && <span className="animate-pulse inline-block h-2 w-2 rounded-full bg-accent" />}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {newsletterSubscribers.length === 0 && <p className="p-20 text-center text-primary/30 italic">Liste d'attente vide.</p>}
            </div>
          </div>
        )}

        {/* --- ONGLET : LA CARTE (MENU) --- */}
        {activeTab === "menu" && <div className="animate-fade-in"><AdminMenuManager /></div>}

        {/* --- ONGLET : PARAMÈTRES CODES PROMOS CRUD --- */}
        {activeTab === "promotions" && (
          <div className="space-y-8 animate-fade-in">
            <div className="grid gap-10 xl:grid-cols-[1.5fr_1fr]">
              <div className="space-y-8">
                <div className="flex items-center justify-between">
                  <h2 className="heading-display text-2xl text-primary">Gestion des Codes Promos</h2>
                  {isLoadingPromos && <span className="text-xs text-primary/40 font-bold">Chargement...</span>}
                </div>

                <div className="overflow-hidden rounded-3xl bg-white shadow-card ring-1 ring-cream/10">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[600px]">
                      <thead className="bg-creamSoft/50 text-primary text-[10px] font-black uppercase tracking-[0.2em]">
                        <tr>
                          <th className="px-8 py-5">Code</th>
                          <th className="px-8 py-5">Réduction</th>
                          <th className="px-8 py-5">Statut</th>
                          <th className="px-8 py-5">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-cream/10">
                        {Object.values(promotions).map(promo => (
                          <tr key={promo.code} className="text-sm hover:bg-cream/5 transition-colors">
                            <td className="px-8 py-5 font-black text-primary uppercase tracking-wider">{promo.code}</td>
                            <td className="px-8 py-5 font-bold text-accent">
                              {promo.discountType === 'percentage' ? promo.discountValue + '%' : promo.discountValue + ' €'}
                            </td>
                            <td className="px-8 py-5">
                              <button
                                onClick={() => handleTogglePromoStatus(promo.code)}
                                className={"inline-flex rounded-lg px-3 py-1 text-[9px] font-black uppercase tracking-widest transition-all " + (promo.isActive ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600')}
                              >
                                {promo.isActive ? 'Actif' : 'Inactif'}
                              </button>
                            </td>
                            <td className="px-8 py-5">
                              <button
                                onClick={() => handleDeletePromo(promo.code)}
                                className="p-2 rounded-full bg-red-50 text-red-500 hover:bg-red-600 hover:text-white transition-all shadow-sm"
                                title="Supprimer le code"
                              >
                                <TrashIcon className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {Object.keys(promotions).length === 0 && !isLoadingPromos && (
                    <p className="p-20 text-center text-primary/30 italic font-medium">Aucun code promo configuré.</p>
                  )}
                </div>
              </div>

              <aside className="space-y-8">
                <div className="rounded-3xl bg-creamSoft/50 p-6 border border-cream/20">
                  <h3 className="text-xs font-black uppercase tracking-widest text-primary/50 mb-6">Ajouter / Modifier un Code</h3>
                  <form onSubmit={handleSavePromo} className="space-y-5">
                    <div>
                      <label className="text-[9px] font-black uppercase tracking-widest text-primary/60 mb-2 block">Code</label>
                      <input
                        type="text"
                        placeholder="Ex: AFRO15"
                        value={promoForm.code}
                        onChange={(e) => setPromoForm({ ...promoForm, code: e.target.value })}
                        required
                        className="field bg-white h-11 text-sm font-bold uppercase tracking-wider"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-black uppercase tracking-widest text-primary/60 mb-2 block">Type de Réduction</label>
                      <select
                        value={promoForm.discountType}
                        onChange={(e) => setPromoForm({ ...promoForm, discountType: e.target.value as 'percentage' | 'fixed' })}
                        className="field bg-white h-11 text-sm font-bold"
                      >
                        <option value="percentage">Pourcentage (%)</option>
                        <option value="fixed">Montant Fixe (€)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[9px] font-black uppercase tracking-widest text-primary/60 mb-2 block">Valeur de Réduction</label>
                      <input
                        type="number"
                        placeholder="Ex: 15"
                        value={promoForm.discountValue || ''}
                        onChange={(e) => setPromoForm({ ...promoForm, discountValue: Number(e.target.value) })}
                        required
                        min="1"
                        className="field bg-white h-11 text-sm font-bold"
                      />
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-2xl bg-white border border-cream/10">
                      <span className="text-[10px] font-black uppercase tracking-widest text-primary/60">Activer le code</span>
                      <button
                        type="button"
                        onClick={() => setPromoForm({ ...promoForm, isActive: !promoForm.isActive })}
                        className={"relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full transition-colors duration-300 " + (promoForm.isActive ? 'bg-accent' : 'bg-primary/20')}
                      >
                        <span className={"inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-300 mt-1 " + (promoForm.isActive ? 'translate-x-6' : 'translate-x-1')} />
                      </button>
                    </div>
                    <button type="submit" className="btn btn-md btn-primary w-full shadow-glow">Sauvegarder</button>
                  </form>
                </div>
              </aside>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Sous-composants ──────────────────────────────────────────

function TabButton({ id, active, onClick, label }: { id: Tab, active: boolean, onClick: (t: Tab) => void, label: string }) {
  return (
    <button
      onClick={() => onClick(id)}
      className={`whitespace-nowrap px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all border-b-2 outline-none ${
        active 
          ? "border-accent text-accent" 
          : "border-transparent text-primary/30 hover:text-primary hover:border-cream/50"
      }`}
    >
      {label}
    </button>
  );
}

function KPI({ title, value, sub, variant = "white", progress, trend }: { title: string, value: string, sub: string, variant?: "white" | "primary", progress?: number, trend?: "up" | "down" }) {
  return (
    <div className={`relative overflow-hidden rounded-3xl p-8 shadow-card ring-1 ring-cream/10 ${
      variant === "primary" ? "bg-primary-gradient text-cream" : "bg-white text-primary"
    }`}>
      <h2 className={`text-[10px] font-black uppercase tracking-[0.2em] ${variant === "primary" ? "text-cream/40" : "text-primary/30"}`}>{title}</h2>
      <div className="flex items-end justify-between mt-3">
        <p className="text-4xl font-display font-black">{value}</p>
        {trend && <span className="font-black text-accent text-xl animate-bounce">↑</span>}
      </div>
      <p className={`mt-2 text-xs font-medium ${variant === "primary" ? "text-cream/60" : "text-primary/40"}`}>{sub}</p>
      {progress !== undefined && (
        <div className="mt-6 flex items-center gap-2">
          <div className="h-1.5 w-full rounded-full bg-creamSoft/30 overflow-hidden">
            <div className="h-full bg-accent shadow-glow" style={{ width: `${Math.min(progress, 100)}%` }}></div>
          </div>
        </div>
      )}
    </div>
  );
}

function OrderRow({ order, onStatusChange, onShowQR }: { order: Order, onStatusChange: (id: string, s: OrderStatus) => void, onShowQR: (id: string) => void }) {
  const { requestOrderDeletion } = useAuth();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (confirm("Voulez-vous demander la suppression de cette commande de l'historique client ?")) {
      setIsDeleting(true);
      await requestOrderDeletion(order.id);
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-8 sm:flex-row sm:items-center sm:justify-between hover:bg-cream/5 transition-colors group">
      <div className="flex items-start gap-5">
        <div className={`h-12 w-12 shrink-0 rounded-2xl flex items-center justify-center ${
          order.status === 'En attente' ? 'bg-orange-50 text-orange-500' : 'bg-blue-50 text-blue-500'
        }`}>
          <ClockIcon className="h-6 w-6" />
        </div>
        <div>
          <div className="flex items-center gap-3">
            <p className="font-display font-black text-primary text-lg">{order.id.substring(0, 8).toUpperCase()}</p>
            <span className={`rounded-lg px-3 py-1 text-[9px] font-black uppercase tracking-widest ${
              order.status === 'En attente' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'
            }`}>
              {order.status}
            </span>
          </div>
          <p className="mt-1 text-sm font-bold text-primary/70">{order.userName}</p>
          <p className="mt-1 text-xs text-primary/40 font-medium">
            {order.items.map((i: any) => `${i.quantity}x ${i.name}`).join(", ")}
          </p>
        </div>
      </div>
      
      <div className="flex flex-col sm:items-end gap-4">
        <p className="font-display font-black text-primary text-xl">{order.total.toFixed(2)} €</p>
        <div className="flex gap-3">
          {order.status !== "Livré" && (
            <button 
              onClick={() => onShowQR(order.id)} 
              className="btn btn-sm bg-creamSoft text-primary border border-cream/20 px-4"
              title="Afficher le QR Code de livraison"
            >
              QR
            </button>
          )}
          {order.status === "Attente Acompte" && (
            <button onClick={() => onStatusChange(order.id, "En attente")} className="btn btn-sm bg-accent text-white px-6 shadow-glow">Acompte reçu</button>
          )}
          {order.status === "En attente" && (
            <button onClick={() => onStatusChange(order.id, "En cours")} className="btn btn-sm bg-primary text-white px-6">Préparer</button>
          )}
          {(order.status === "En cours" || order.status === "Acompte Reçu") && (
            <button onClick={() => onStatusChange(order.id, "Livré")} className="btn btn-sm bg-accent text-white px-6 shadow-glow">Terminer</button>
          )}
          <button 
            onClick={handleDelete} 
            disabled={isDeleting || (order as any).deletionRequested}
            className={`btn btn-sm px-3 ${ (order as any).deletionRequested ? 'bg-gray-100 text-gray-400' : 'bg-red-50 text-red-500 hover:bg-red-500 hover:text-white border border-red-100'}`}
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

