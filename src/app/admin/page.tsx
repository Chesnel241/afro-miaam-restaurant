"use client";

import { useAuth } from "@/components/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { GiftIcon, CheckIcon, ClockIcon, MailIcon } from "@/components/Icons";

type Tab = "overview" | "orders" | "customers" | "newsletter";

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
  const activeOrders = allOrders.filter(o => o.status === "En attente" || o.status === "En cours");
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

  const handleStatusChange = async (orderId: string, newStatus: "En cours" | "Livré") => {
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
    alert("Tous les emails ont été copiés dans le presse-papier !");
  };

  return (
    <div className="container-x py-12 sm:py-20">
      {/* Header Admin */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="heading-display text-3xl text-primary sm:text-4xl">
            Panel <span className="text-accent">Administrateur</span>
          </h1>
          <p className="mt-2 text-primary/75">Bonjour {user.name}, prêt pour le service ?</p>
        </div>
        <button
          onClick={async () => {
            await logout();
            router.push("/login");
          }}
          className="btn btn-md btn-danger"
        >
          Se déconnecter
        </button>
      </div>

      {/* Navigation Onglets */}
      <div className="mt-10 flex flex-wrap border-b border-cream/30 gap-2">
        <TabButton id="overview" active={activeTab === "overview"} onClick={setActiveTab} label="Vue d'ensemble" />
        <TabButton id="orders" active={activeTab === "orders"} onClick={setActiveTab} label={`Commandes (${activeOrders.length})`} />
        <TabButton id="customers" active={activeTab === "customers"} onClick={setActiveTab} label="Clients & Fidélité" />
        <TabButton id="newsletter" active={activeTab === "newsletter"} onClick={setActiveTab} label="Newsletter" />
      </div>

      <div className="mt-8">
        {/* --- ONGLET : VUE D'ENSEMBLE --- */}
        {activeTab === "overview" && (
          <div className="space-y-10">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <KPI 
                title="Chiffre d'Affaires" 
                value={`${totalRevenue.toFixed(2)} €`} 
                sub="Total cumulé"
                variant="primary"
              />
              <KPI 
                title="Total Commandes" 
                value={totalOrdersCount.toString()} 
                sub="Objectif 100"
                progress={(totalOrdersCount / 100) * 100}
              />
              <KPI 
                title="Ce Mois-ci" 
                value={`${currentMonthRevenue.toFixed(2)} €`} 
                sub={`${currentMonthOrders.length} commandes`}
                trend="up"
              />
            </div>

            <div className="grid gap-10 lg:grid-cols-2">
              <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-cream/20">
                <h3 className="heading-display mb-4 text-xl text-primary">Dernières commandes</h3>
                <div className="divide-y divide-cream/20">
                  {allOrders.slice(0, 5).map(o => (
                    <div key={o.id} className="py-3 flex justify-between items-center">
                      <span className="text-sm font-bold text-primary">{o.userName}</span>
                      <span className="text-xs text-primary/60">{o.total.toFixed(2)} €</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-cream/20">
                <h3 className="heading-display mb-4 text-xl text-primary">Tendances Mensuelles</h3>
                <div className="space-y-4">
                  {monthlyDataArray.map((data, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <span className="text-sm font-bold text-primary capitalize">{data.month}</span>
                      <span className="text-sm font-bold text-accent">{data.revenue.toFixed(2)} €</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- ONGLET : COMMANDES --- */}
        {activeTab === "orders" && (
          <div className="grid gap-10 xl:grid-cols-[1fr_350px]">
             <div className="space-y-10">
               <div>
                 <h2 className="heading-display mb-4 text-2xl text-primary">À traiter ({activeOrders.length})</h2>
                 <div className="rounded-2xl bg-white shadow-sm ring-1 ring-cream/20 divide-y divide-cream/30">
                   {activeOrders.map(order => (
                     <OrderRow key={order.id} order={order} onStatusChange={handleStatusChange} />
                   ))}
                   {activeOrders.length === 0 && <p className="p-10 text-center text-primary/50">Aucune commande en attente.</p>}
                 </div>
               </div>
               <div>
                 <h2 className="heading-display mb-4 text-2xl text-primary">Historique (Dernières 20)</h2>
                 <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-cream/20 divide-y divide-cream/20">
                    {historyOrders.slice(0, 20).map(order => (
                      <div key={order.id} className="flex items-center justify-between py-3">
                        <div>
                          <p className="text-sm font-bold text-primary">{order.id.substring(0, 8).toUpperCase()} - {order.userName}</p>
                          <p className="text-xs text-primary/60">{order.createdAt}</p>
                        </div>
                        <p className="text-sm font-bold text-primary">{order.total.toFixed(2)} €</p>
                      </div>
                    ))}
                 </div>
               </div>
             </div>
          </div>
        )}

        {/* --- ONGLET : CLIENTS --- */}
        {activeTab === "customers" && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {allCustomers.map(customer => {
              const percentage = Math.min(((customer.ordersCount % maxOrders) / maxOrders) * 100, 100);
              const isEligible = customer.ordersCount > 0 && customer.ordersCount % maxOrders === 0;
              return (
                <div key={customer.id} className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-cream/20">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-primary">{customer.name}</h3>
                      <p className="text-xs text-primary/60">{customer.email}</p>
                    </div>
                    {isEligible && <GiftIcon className="h-6 w-6 text-accent animate-bounce" />}
                  </div>
                  <div className="mt-4">
                    <div className="flex justify-between text-xs mb-1">
                      <span>Progression Fidélité</span>
                      <span>{customer.ordersCount % maxOrders} / 10</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-cream/40">
                      <div className={`h-2 rounded-full ${isEligible ? 'bg-accent' : 'bg-primary'}`} style={{ width: `${percentage}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* --- ONGLET : NEWSLETTER --- */}
        {activeTab === "newsletter" && (
          <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="heading-display text-2xl text-primary">Inscrits Newsletter</h2>
                <p className="text-sm text-primary/70">{newsletterSubscribers.length} personnes attendent vos nouvelles.</p>
              </div>
              <div className="flex gap-2">
                <button onClick={copyAllEmails} className="btn btn-sm bg-cream text-primary">
                  Copier tous les emails
                </button>
                <button onClick={exportNewsletterCSV} className="btn btn-sm bg-primary text-cream">
                  Exporter CSV
                </button>
                <a 
                  href="https://www.mailerlite.com/" 
                  target="_blank" 
                  rel="noreferrer" 
                  className="btn btn-sm bg-accent text-white"
                >
                  Ouvrir MailerLite
                </a>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-cream/20">
              <table className="w-full text-left border-collapse">
                <thead className="bg-creamSoft text-primary text-sm font-bold uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Email</th>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Source</th>
                    <th className="px-6 py-4">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cream/20">
                  {newsletterSubscribers.map(sub => {
                    const isNew = (new Date().getTime() - new Date(sub.createdAt).getTime()) < (7 * 24 * 60 * 60 * 1000);
                    return (
                      <tr key={sub.id} className="text-sm hover:bg-cream/5">
                        <td className="px-6 py-4 font-semibold text-primary">{sub.email}</td>
                        <td className="px-6 py-4 text-primary/70">{sub.createdAt}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-bold ${
                            sub.source === 'inscription' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                          }`}>
                            {sub.source}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {isNew && <span className="animate-pulse rounded-full bg-accent/20 px-2 py-0.5 text-xs font-bold text-accent">Nouveau !</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {newsletterSubscribers.length === 0 && <p className="p-10 text-center text-primary/50">Aucun inscrit pour le moment.</p>}
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

function KPI({ title, value, sub, variant = "white", progress, trend }: { title: string, value: string, sub: string, variant?: "white" | "primary", progress?: number, trend?: "up" | "down" }) {
  return (
    <div className={`relative overflow-hidden rounded-2xl p-6 shadow-sm ring-1 ring-cream/20 ${
      variant === "primary" ? "bg-primary-gradient text-cream" : "bg-white text-primary"
    }`}>
      <h2 className={`text-xs font-bold uppercase tracking-wider ${variant === "primary" ? "text-cream/70" : "text-primary/60"}`}>{title}</h2>
      <div className="flex items-end justify-between mt-2">
        <p className="text-4xl font-display font-bold">{value}</p>
        {trend && <span className="font-bold text-accent">↑</span>}
      </div>
      <p className={`mt-1 text-sm ${variant === "primary" ? "text-cream/80" : "text-primary/60"}`}>{sub}</p>
      {progress !== undefined && (
        <div className="mt-4 flex items-center gap-2">
          <div className="h-1.5 w-full rounded-full bg-cream/30">
            <div className="h-1.5 rounded-full bg-accent" style={{ width: `${Math.min(progress, 100)}%` }}></div>
          </div>
        </div>
      )}
    </div>
  );
}

function OrderRow({ order, onStatusChange }: { order: unknown, onStatusChange: unknown }) {
  return (
    <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="flex items-center gap-3">
          <p className="font-bold text-primary">{order.id.substring(0, 8).toUpperCase()}</p>
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
            order.status === 'En attente' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'
          }`}>
            {order.status === 'En attente' && <ClockIcon className="mr-1 h-3 w-3" />}
            {order.status}
          </span>
        </div>
        <p className="mt-1 text-sm text-primary/70">{order.userName} ({order.userEmail})</p>
        <p className="mt-1 text-xs text-primary/60">
          {order.items.map((i: unknown) => `${i.quantity}x ${i.name}`).join(", ")}
        </p>
      </div>
      <div className="flex items-center gap-4">
        <p className="font-bold text-primary">{order.total.toFixed(2)} €</p>
        <div className="flex gap-2">
          {order.status === "En attente" && (
            <button onClick={() => onStatusChange(order.id, "En cours")} className="btn btn-sm bg-primary text-cream">Confirmer</button>
          )}
          <button onClick={() => onStatusChange(order.id, "Livré")} className="btn btn-sm bg-accent text-white">Livré</button>
        </div>
      </div>
    </div>
  );
}
