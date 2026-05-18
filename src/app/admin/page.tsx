"use client";

import { useAuth, type Order, type OrderStatus } from "@/components/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { GiftIcon, CheckIcon, ClockIcon, MailIcon, PlusIcon, UserIcon, CartIcon, TrashIcon } from "@/components/Icons";
import { AdminMenuManager } from "@/components/AdminMenuManager";
import { QRCodeSVG } from "qrcode.react";

type Tab = "overview" | "orders" | "customers" | "newsletter" | "menu";

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
    updateOrderStatus 
  } = useAuth();
  
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [selectedOrderForQR, setSelectedOrderForQR] = useState<string | null>(null);

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

  const maxOrders = 10;

  // Séparation des commandes
  const depositPendingOrders = allOrders.filter(o => o.status === "Attente Acompte");
  const activeOrders = allOrders.filter(o => o.status === "En attente" || o.status === "En cours" || o.status === "Acompte Reçu");
  const historyOrders = allOrders.filter(o => o.status === "Livré");

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

      {/* Navigation Onglets */}
      <div className="mt-10 flex flex-wrap border-b border-cream/30 gap-1 sm:gap-6 overflow-x-auto no-scrollbar scroll-smooth">
        <TabButton id="overview" active={activeTab === "overview"} onClick={setActiveTab} label="Vue d'ensemble" />
        <TabButton id="orders" active={activeTab === "orders"} onClick={setActiveTab} label={`Commandes (${activeOrders.length})`} />
        <TabButton id="customers" active={activeTab === "customers"} onClick={setActiveTab} label="Clients & Fidélité" />
        <TabButton id="newsletter" active={activeTab === "newsletter"} onClick={setActiveTab} label="Newsletter" />
        <TabButton id="menu" active={activeTab === "menu"} onClick={setActiveTab} label="La Carte" />
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
              <div className="rounded-3xl bg-white p-8 shadow-card ring-1 ring-cream/10">
                <h3 className="heading-display mb-6 text-xl text-primary">Commandes récentes</h3>
                <div className="divide-y divide-cream/10">
                  {allOrders.slice(0, 5).map(o => (
                    <div key={o.id} className="py-4 flex justify-between items-center group">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-primary group-hover:text-accent transition-colors">{o.userName}</span>
                        <span className="text-[10px] text-primary/40 uppercase tracking-widest">{o.createdAt}</span>
                      </div>
                      <span className="font-display font-black text-primary">{o.total.toFixed(2)} €</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-3xl bg-white p-8 shadow-card ring-1 ring-cream/10">
                <h3 className="heading-display mb-6 text-xl text-primary">Performances Mensuelles</h3>
                <div className="space-y-5">
                  {monthlyDataArray.map((data, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <span className="text-xs font-black text-primary/60 uppercase tracking-widest truncate">{data.month}</span>
                      <div className="flex items-center gap-4">
                         <span className="h-1.5 w-24 rounded-full bg-creamSoft overflow-hidden hidden sm:block">
                            <div className="h-full bg-accent opacity-50" style={{ width: `${Math.min((data.revenue / 5000) * 100, 100)}%` }} />
                         </span>
                         <span className="text-sm font-black text-accent">{data.revenue.toFixed(2)} €</span>
                      </div>
                    </div>
                  ))}
                </div>
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
              return (
                <div key={customer.id} className="rounded-3xl bg-white p-8 shadow-card ring-1 ring-cream/10 flex flex-col justify-between hover:scale-[1.02] transition-transform">
                  <div>
                    <div className="flex justify-between items-start mb-6">
                      <div className="h-12 w-12 rounded-2xl bg-primary/5 flex items-center justify-center text-primary">
                        <UserIcon className="h-6 w-6" />
                      </div>
                      {isEligible && <GiftIcon className="h-8 w-8 text-accent animate-bounce shadow-glow" />}
                    </div>
                    <h3 className="font-display font-black text-primary text-lg truncate">{customer.name}</h3>
                    <p className="text-xs text-primary/40 truncate">{customer.email}</p>
                    <p className="text-xs font-black text-accent mt-2 tracking-widest">{customer.phone || "---"}</p>
                  </div>
                  
                  <div className="mt-8 pt-6 border-t border-cream/10">
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

