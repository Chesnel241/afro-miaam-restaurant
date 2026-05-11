"use client";

import { useAuth } from "@/components/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { GiftIcon, CheckIcon, ClockIcon } from "@/components/Icons";

export default function AdminPage() {
  const { user, loading, logout, allOrders, allCustomers, updateOrderStatus } = useAuth();
  const router = useRouter();

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

  const customers = allCustomers;
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

  return (
    <div className="container-x py-12 sm:py-20">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="heading-display text-3xl text-primary sm:text-4xl">
            Panel <span className="text-accent">Administrateur</span>
          </h1>
          <p className="mt-2 text-primary/75">Contrôle complet : Commandes, Finances et Clients.</p>
        </div>
        <button
          onClick={async () => {
            await logout();
            router.push("/login");
          }}
          className="btn btn-md bg-cream text-primary shadow-sm hover:bg-cream/80"
        >
          Se déconnecter
        </button>
      </div>

      {/* --- Section 1: KPIs Globaux --- */}
      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {/* Globe / Jauge CA */}
        <div className="relative overflow-hidden rounded-2xl bg-primary-gradient p-6 text-cream shadow-soft">
          <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-white/10 blur-2xl"></div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-cream/70">Chiffre d&apos;Affaires</h2>
          <p className="mt-2 text-4xl font-display font-bold text-accent">{totalRevenue.toFixed(2)} €</p>
          <p className="mt-1 text-sm text-cream/80">Total cumulé à ce jour</p>
        </div>

        {/* Globe / Jauge Commandes */}
        <div className="relative overflow-hidden rounded-2xl bg-white p-6 shadow-sm ring-1 ring-cream/20">
          <h2 className="text-sm font-bold uppercase tracking-wider text-primary/60">Total Commandes</h2>
          <p className="mt-2 text-4xl font-display font-bold text-primary">{totalOrdersCount}</p>
          <div className="mt-4 flex items-center gap-2">
            <div className="h-2 w-full rounded-full bg-cream/30">
              <div className="h-2 rounded-full bg-accent" style={{ width: `${Math.min((totalOrdersCount / 100) * 100, 100)}%` }}></div>
            </div>
            <span className="text-xs text-primary/60">Objectif 100</span>
          </div>
        </div>

        {/* Bilan du mois en cours */}
        <div className="relative overflow-hidden rounded-2xl bg-white p-6 shadow-sm ring-1 ring-cream/20">
          <h2 className="text-sm font-bold uppercase tracking-wider text-primary/60">Ce Mois-ci</h2>
          <div className="mt-3 flex items-end justify-between">
            <div>
              <p className="text-2xl font-bold text-primary">{currentMonthRevenue.toFixed(2)} €</p>
              <p className="text-xs text-primary/60">{currentMonthOrders.length} commandes</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/20 text-accent">
              <span className="font-bold">↑</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-10 grid gap-10 xl:grid-cols-[1fr_350px]">
        
        <div className="flex flex-col gap-10">
          {/* --- Section 2: Commandes en cours --- */}
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="heading-display text-2xl text-primary">Commandes en attente / en cours</h2>
              <span className="rounded-full bg-accent px-3 py-1 text-xs font-bold text-white shadow-sm">
                {activeOrders.length} à traiter
              </span>
            </div>
            
            <div className="rounded-2xl bg-white shadow-sm ring-1 ring-cream/20">
              {activeOrders.length === 0 ? (
                <div className="p-8 text-center text-primary/60">Aucune commande en cours.</div>
              ) : (
                <div className="divide-y divide-cream/30">
                  {activeOrders.map((order) => (
                    <div key={order.id} className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="flex items-center gap-3">
                          <p className="font-bold text-primary">{order.id.substring(0, 8).toUpperCase()}</p>
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            order.status === 'En attente' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'
                          }`}>
                            {order.status === 'En attente' ? <ClockIcon className="mr-1 h-3 w-3" /> : null}
                            {order.status}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-primary/70">Client: {order.userName} ({order.userEmail})</p>
                        <p className="text-xs text-primary/50">Date: {new Date(order.createdAt).toLocaleDateString("fr-FR")}</p>
                        {order.items.length > 0 && (
                          <p className="mt-1 text-xs text-primary/60">
                            {order.items.map(i => `${i.quantity}x ${i.name}`).join(", ")}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-4">
                        <p className="font-bold text-primary">{order.total.toFixed(2)} €</p>
                        <div className="flex flex-col gap-2 sm:flex-row">
                          {order.status === "En attente" && (
                            <button
                              onClick={() => handleStatusChange(order.id, "En cours")}
                              className="btn btn-sm bg-primaryLight text-cream hover:bg-primary"
                            >
                              Confirmer (En cours)
                            </button>
                          )}
                          <button
                            onClick={() => handleStatusChange(order.id, "Livré")}
                            className="btn btn-sm bg-accent text-white hover:bg-accentSoft"
                          >
                            <CheckIcon className="mr-1 h-4 w-4" /> Livré
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* --- Section 3: Historique des commandes livrées --- */}
          <div>
            <h2 className="heading-display mb-4 text-2xl text-primary">Historique des commandes</h2>
            <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-cream/20">
               <div className="max-h-64 overflow-y-auto pr-2">
                 {historyOrders.length === 0 ? (
                    <p className="text-center text-primary/60">Aucun historique.</p>
                 ) : (
                   <div className="divide-y divide-cream/20">
                     {historyOrders.map(order => (
                       <div key={order.id} className="flex items-center justify-between py-3">
                         <div>
                           <p className="text-sm font-bold text-primary">{order.id.substring(0, 8).toUpperCase()} - {order.userName}</p>
                           <p className="text-xs text-primary/60">{new Date(order.createdAt).toLocaleDateString("fr-FR")}</p>
                         </div>
                         <div className="text-right">
                           <p className="text-sm font-bold text-primary">{order.total.toFixed(2)} €</p>
                           <span className="text-xs text-accent">Livré ✓</span>
                         </div>
                       </div>
                     ))}
                   </div>
                 )}
               </div>
            </div>
          </div>
        </div>

        {/* --- Sidebar droite : Tendances & Fidélité --- */}
        <div className="flex flex-col gap-8">
          {/* Tendances Mensuelles */}
          <div>
            <h2 className="heading-display mb-4 text-xl text-primary">Tendances Mensuelles</h2>
            <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-cream/20">
              {monthlyDataArray.length === 0 ? (
                <p className="text-center text-sm text-primary/60">Aucune donnée encore.</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {monthlyDataArray.map((data, i) => (
                    <div key={i} className="flex items-center justify-between border-b border-cream/20 pb-2 last:border-0 last:pb-0">
                      <div>
                        <p className="text-sm font-bold text-primary capitalize">{data.month}</p>
                        <p className="text-xs text-primary/60">{data.count} commandes</p>
                      </div>
                      <p className="text-sm font-bold text-accent">{data.revenue.toFixed(2)} €</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Fidélité Clients */}
          <div>
            <h2 className="heading-display mb-4 text-xl text-primary">Fidélité Clients</h2>
            <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-cream/20">
              {customers.length === 0 ? (
                <p className="text-center text-sm text-primary/60">Aucun client inscrit.</p>
              ) : (
                <div className="flex flex-col gap-4">
                  {customers.map((customer) => {
                    const isEligible = customer.ordersCount > 0 && customer.ordersCount % maxOrders === 0;
                    const percentage = Math.min(((customer.ordersCount % maxOrders) / maxOrders) * 100, 100);

                    return (
                      <div key={customer.id} className="flex flex-col gap-1">
                        <div className="flex justify-between">
                          <span className="text-sm font-bold text-primary">{customer.name}</span>
                          {isEligible ? (
                            <GiftIcon className="h-4 w-4 text-accent" />
                          ) : (
                            <span className="text-xs text-primary/60">{customer.ordersCount % maxOrders}/10</span>
                          )}
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-cream/40">
                          <div
                            className={`h-1.5 rounded-full ${isEligible ? 'bg-accent' : 'bg-primaryLight'}`}
                            style={{ width: `${isEligible ? 100 : percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
