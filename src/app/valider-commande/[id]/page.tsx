"use client";

import { useAuth } from "@/components/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { motion, AnimatePresence } from "framer-motion";
import { CheckIcon, ClockIcon } from "@/components/Icons";

export default function ValiderCommandePage({ params }: { params: Promise<{ id: string }> }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [orderId, setOrderId] = useState<string>("");
  const [order, setOrder] = useState<any>(null);
  const [verifying, setVerifying] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    let cancelled = false;
    params.then((p) => {
      if (!cancelled) setOrderId(p.id);
    });
    return () => {
      cancelled = true;
    };
  }, [params]);

  useEffect(() => {
    if (!orderId) return;
    if (!loading && !user) {
      router.push(`/login?redirect=/valider-commande/${orderId}`);
      return;
    }

    const fetchOrder = async () => {
      try {
        const docRef = doc(db, "orders", orderId);
        const snap = await getDoc(docRef);
        
        if (!snap.exists()) {
          setError("Commande introuvable.");
          setVerifying(false);
          return;
        }

        const data = snap.data();
        
        // Vérification de sécurité : la commande doit appartenir à l'utilisateur
        if (data.userId !== user?.id && data.userEmail?.toLowerCase() !== user?.email?.toLowerCase()) {
          setError("Vous n'êtes pas autorisé à valider cette commande.");
          setVerifying(false);
          return;
        }

        if (data.status === "Livré") {
          setSuccess(true);
          setOrder(data);
          setVerifying(false);
          return;
        }

        setOrder(data);
        setVerifying(false);
      } catch (err) {
        console.error(err);
        setError("Erreur lors de la récupération de la commande.");
        setVerifying(false);
      }
    };

    if (user) fetchOrder();
  }, [user, loading, orderId, router]);

  const handleValider = async () => {
    setIsUpdating(true);
    try {
      const docRef = doc(db, "orders", orderId);
      await updateDoc(docRef, {
        status: "Livré",
        deliveredAt: new Date().toISOString()
      });
      setSuccess(true);
      // On attend un peu pour l'animation
      setTimeout(() => {
        router.push("/mon-compte?tab=orders");
      }, 3000);
    } catch (err) {
      console.error(err);
      setError("Erreur lors de la validation de la livraison. Veuillez réessayer.");
    } finally {
      setIsUpdating(false);
    }
  };

  if (loading || verifying) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-creamSoft">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-accent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-creamSoft py-12 px-6">
      <div className="mx-auto max-w-md">
        <AnimatePresence mode="wait">
          {error ? (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-3xl bg-white p-8 text-center shadow-xl ring-1 ring-black/5"
            >
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-600">
                <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h1 className="heading-display mb-2 text-2xl text-primary">Oups !</h1>
              <p className="text-primary/60">{error}</p>
              <button onClick={() => router.push("/")} className="btn btn-primary mt-8 w-full">Retour à l'accueil</button>
            </motion.div>
          ) : success ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-3xl bg-white p-10 text-center shadow-xl ring-1 ring-black/5"
            >
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100 text-green-600">
                <CheckIcon className="h-10 w-10" />
              </div>
              <h1 className="heading-display mb-2 text-2xl text-primary">Merci !</h1>
              <p className="text-primary/60 font-medium">Votre commande a été marquée comme livrée. Bon appétit !</p>
              <p className="mt-6 text-[10px] font-black uppercase tracking-widest text-accent italic">Redirection vers votre historique...</p>
            </motion.div>
          ) : (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-3xl bg-white p-8 shadow-xl ring-1 ring-black/5"
            >
              <div className="mb-8 flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10 text-accent">
                  <ClockIcon className="h-6 w-6" />
                </div>
                <div>
                  <h1 className="heading-display text-xl text-primary">Validation de Livraison</h1>
                  <p className="text-xs text-primary/40 font-bold uppercase tracking-widest">Commande #{orderId.substring(0,8).toUpperCase()}</p>
                </div>
              </div>

              <div className="space-y-4 rounded-2xl bg-creamSoft/50 p-6 border border-cream/20 mb-8">
                <p className="text-sm font-bold text-primary">Détails :</p>
                <ul className="space-y-2">
                  {order?.items.map((item: any, i: number) => (
                    <li key={i} className="text-xs text-primary/60 flex justify-between">
                      <span>{item.quantity}x {item.name}</span>
                      <span className="font-bold">{(item.price * item.quantity).toFixed(2)} €</span>
                    </li>
                  ))}
                </ul>
                <div className="pt-4 border-t border-cream/20 flex justify-between items-center">
                  <span className="text-xs font-black uppercase text-primary/40">Total payé</span>
                  <span className="text-lg font-black text-primary">{order?.total.toFixed(2)} €</span>
                </div>
              </div>

              <button 
                onClick={handleValider}
                disabled={isUpdating}
                className="btn btn-primary w-full py-6 text-lg shadow-glow relative overflow-hidden"
              >
                {isUpdating ? (
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/30 border-t-white mx-auto" />
                ) : (
                  "Confirmer la Réception"
                )}
              </button>
              <p className="mt-6 text-center text-[10px] text-primary/40 italic font-medium">
                En cliquant, vous confirmez avoir reçu votre commande et déchargez le restaurant de la livraison.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
