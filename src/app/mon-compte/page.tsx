"use client";

import { useAuth } from "@/components/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { GiftIcon, ArrowRightIcon, TrashIcon } from "@/components/Icons";

export default function MonComptePage() {
  const { user, loading, logout, deleteAccount, userOrders } = useAuth();
  const router = useRouter();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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
  const progressPercentage = Math.min(((ordersCount % maxOrders) / maxOrders) * 100, 100);
  const remaining = maxOrders - (ordersCount % maxOrders);
  const isRewardReady = ordersCount > 0 && ordersCount % maxOrders === 0;

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
          <div className="rounded-2xl bg-primary-gradient p-6 text-cream shadow-soft">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-accent/20 text-accent">
                <GiftIcon className="h-5 w-5" />
              </span>
              <h2 className="font-display text-xl font-bold">Votre Fidélité</h2>
            </div>
            
            <div className="mt-6">
              {isRewardReady ? (
                <div className="rounded-xl bg-accent p-4 text-center">
                  <p className="font-bold text-white">Félicitations ! 🎉</p>
                  <p className="text-sm text-white/90">Votre 11ème commande est offerte.</p>
                  <p className="mt-2 text-xs font-bold uppercase tracking-wider text-white">Code promo : AFRO-FREE11</p>
                </div>
              ) : (
                <>
                  <p className="text-sm text-cream/80">
                    Plus que <strong className="text-white">{remaining} commande{remaining > 1 ? 's' : ''}</strong> pour obtenir votre repas offert !
                  </p>
                  <div className="mt-3 h-4 w-full overflow-hidden rounded-full bg-cream/10">
                    <div
                      className="h-full bg-accent transition-all duration-1000 ease-out"
                      style={{ width: `${progressPercentage}%` }}
                    />
                  </div>
                  <div className="mt-2 flex justify-between text-xs text-cream/60">
                    <span>{ordersCount % maxOrders}</span>
                    <span>10 commandes</span>
                  </div>
                </>
              )}
            </div>

            <p className="mt-4 text-xs text-cream/50">
              Total de commandes livrées : {ordersCount}
            </p>
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
                  <div className="text-right">
                    <p className="font-bold text-primary">{order.total.toFixed(2)} €</p>
                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
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
            <div className="mt-10 text-center">
              <p className="text-primary/60">Vous n&apos;avez pas encore passé de commande.</p>
              <Link href="/menu" className="btn btn-primary mt-4 inline-flex">
                Voir le menu <ArrowRightIcon className="ml-2 h-4 w-4" />
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
