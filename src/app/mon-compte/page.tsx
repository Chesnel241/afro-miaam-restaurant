"use client";

import { useAuth } from "@/components/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { GiftIcon, ArrowRightIcon, TrashIcon, ClockIcon } from "@/components/Icons";

export default function MonComptePage() {
  const { user, loading, logout, deleteAccount, userOrders } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    } else if (!loading && user?.role === "admin") {
      router.push("/admin");
    }
  }, [user, loading, router]);

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
  
  // Logique de récompense : si on a 10, 20, 30... commandes LIVRÉES
  const isRewardReady = ordersCount > 0 && currentCycleCount === 0;

  const handleDelete = async () => {
    if (confirm("Êtes-vous sûr de vouloir supprimer votre compte ? Cette action est irréversible.")) {
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
      {/* Notification "Push" Style */}
      {remaining <= 2 && !isRewardReady && (
        <div className="mb-8 animate-in fade-in slide-in-from-top-4 duration-700">
          <div className="flex items-center justify-between rounded-2xl bg-accent p-4 text-white shadow-glow">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
                <GiftIcon className="h-5 w-5" />
              </span>
              <div>
                <p className="font-bold">C&apos;est presque prêt ! 🎁</p>
                <p className="text-sm text-white/90">
                  {remaining === 1 
                    ? "Plus qu'une commande pour votre repas offert !" 
                    : "Encore 2 petites commandes et c'est la fête !"}
                </p>
              </div>
            </div>
            <Link href="/menu" className="rounded-full bg-white px-4 py-2 text-xs font-bold text-accent hover:bg-cream transition">
              Commander
            </Link>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="heading-display text-3xl text-primary sm:text-4xl">
            Bonjour, <span className="text-accent">{user.name}</span>
          </h1>
          <p className="mt-2 text-primary/75">Gérez vos commandes et votre fidélité ici.</p>
        </div>
        <div className="flex gap-3">
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
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_2fr]">
        {/* Colonne Fidélité (Gamification) */}
        <div className="flex flex-col gap-6">
          <div className="relative overflow-hidden rounded-2xl bg-primary-gradient p-6 text-cream shadow-soft">
            <div className="afro-side-pattern absolute inset-0 opacity-10" aria-hidden="true" />
            <div className="relative z-10">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-accent/20 text-accent">
                  <GiftIcon className="h-5 w-5" />
                </span>
                <h2 className="font-display text-xl font-bold">Votre Fidélité</h2>
              </div>
              
              <div className="mt-6">
                {isRewardReady ? (
                  <div className="rounded-xl bg-accent p-6 text-center shadow-glow animate-bounce">
                    <p className="text-2xl">🎉</p>
                    <p className="font-bold text-white text-lg">Félicitations !</p>
                    <p className="text-sm text-white/90 mt-1">Votre prochaine commande est offerte.</p>
                    <div className="mt-4 rounded-lg bg-white/10 p-2 border border-white/20">
                       <p className="text-[10px] uppercase tracking-widest text-white/60">Code de récompense</p>
                       <p className="font-mono font-bold text-white">AFRO-FREE-ORDER</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between items-end mb-2">
                      <p className="text-sm text-cream/80 leading-snug">
                        {remaining === 1 
                          ? "Dernière ligne droite ! 🤩" 
                          : remaining === 2 
                          ? "Tu y es presque... allez ! 💪" 
                          : `Plus que ${remaining} commande${remaining > 1 ? 's' : ''} !`}
                      </p>
                      <span className="text-xs font-bold text-accent">{currentCycleCount}/10</span>
                    </div>

                    <div className="relative h-4 w-full overflow-hidden rounded-full bg-cream/10 border border-white/5">
                      <div
                        className={`h-full bg-accent transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(255,107,0,0.5)] ${remaining <= 2 ? 'animate-pulse' : ''}`}
                        style={{ width: `${progressPercentage}%` }}
                      />
                    </div>
                    
                    {/* Stickers / Badges contextuels */}
                    <div className="mt-4 flex justify-center">
                      {currentCycleCount >= 8 && (
                        <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-accent border border-accent/20 animate-pulse">
                          🔥 Niveau Passionné
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>

              <p className="mt-6 text-[10px] text-cream/40 text-center uppercase tracking-widest">
                Total historique : {ordersCount} commandes
              </p>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-cream/20">
            <h3 className="font-bold text-primary">Paramètres</h3>
            <div className="mt-4">
              <button
                onClick={handleDelete}
                className="flex w-full items-center gap-2 rounded-xl border border-afro-red/20 p-4 text-sm font-semibold text-afro-red hover:bg-afro-red/5 transition"
              >
                <TrashIcon className="h-4 w-4" />
                Supprimer mon compte
              </button>
              <p className="mt-2 text-[10px] text-primary/40">
                La suppression supprimera vos données de fidélité et votre historique de manière permanente.
              </p>
            </div>
          </div>
        </div>

        {/* Colonne Historique */}
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-cream/20 sm:p-8">
          <h2 className="heading-display text-2xl text-primary">Historique des commandes</h2>
          
          {userOrders.length > 0 ? (
            <div className="mt-6 divide-y divide-cream/30">
              {userOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
                  <div className="flex gap-4">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                      order.status === 'Livré' ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'
                    }`}>
                      {order.status === 'Livré' ? <GiftIcon className="h-5 w-5" /> : <ClockIcon className="h-5 w-5" />}
                    </div>
                    <div>
                      <p className="font-bold text-primary">{order.id.substring(0, 8).toUpperCase()}</p>
                      <p className="text-sm text-primary/60">
                        {new Date(order.createdAt).toLocaleDateString("fr-FR")}
                      </p>
                      {order.items.length > 0 && (
                        <p className="mt-1 text-xs text-primary/50">
                          {order.items.map(i => i.name).join(", ")}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-primary">{order.total.toFixed(2)} €</p>
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
              ))}
            </div>
          ) : (
            <div className="mt-10 flex flex-col items-center text-center">
              <p className="text-primary/60">Vous n&apos;avez pas encore passé de commande.</p>
              <Link href="/menu" className="btn btn-md bg-accent text-white mt-6 px-10">
                Voir le menu
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
