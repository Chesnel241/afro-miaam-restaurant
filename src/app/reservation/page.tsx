"use client";

import { useAuth } from "@/components/AuthContext";
import { useCart } from "@/components/CartContext";
import { db } from "@/lib/firebase";
import { formatPrice } from "@/lib/utils";
import { collection, addDoc, serverTimestamp, doc, updateDoc, increment } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";
import { CheckIcon, ClockIcon, MapPinIcon, PhoneIcon, UserIcon } from "@/components/Icons";
import { DELIVERY_FEE } from "@/lib/booking";

export default function ReservationPage() {
  const { cart, subtotal, clearCart } = useCart();
  const { user } = useAuth();
  const router = useRouter();

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
    deliveryMode: "retrait" as "retrait" | "livraison",
    date: "",
    slot: "",
    notes: "",
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Pré-remplir avec les infos du compte
  useEffect(() => {
    if (user && !form.firstName && !form.lastName) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForm((f) => ({
        ...f,
        firstName: user.name.split(" ")[0] || "",
        lastName: user.name.split(" ").slice(1).join(" ") || "",
        email: user.email || "",
        phone: user.phone || "",
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const canSubmit =
    (cart ?? []).length > 0 &&
    form.firstName &&
    form.lastName &&
    form.phone &&
    form.date &&
    form.slot &&
    (form.deliveryMode === "retrait" || form.address);

  const total = subtotal + (form.deliveryMode === "livraison" ? DELIVERY_FEE : 0);
  const depositAmount = total * 0.3;

  // Calcul de la date minimale (Demain) - Directement au rendu pour éviter le délai d'effet
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split("T")[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    // Vérification de sécurité J+1
    if (form.date < minDate) {
      alert("Désolé, les réservations doivent être effectuées au moins 24h à l'avance (à partir de demain).");
      return;
    }

    setLoading(true);
    try {
      // Nettoyage des items pour Firestore (éviter les undefined)
      const sanitizedItems = cart.map(item => ({
        id: item.id || "unknown",
        name: item.name || "Plat sans nom",
        price: item.price || 0,
        quantity: item.quantity || 1,
        flavor: item.flavor || null,
        image: item.image || ""
      }));

      const orderData = {
        userId: user?.uid || null,
        userName: user?.name || `${form.firstName} ${form.lastName}`,
        userEmail: user?.email || form.email || "",
        items: sanitizedItems,
        subtotal,
        deliveryFee: form.deliveryMode === "livraison" ? DELIVERY_FEE : 0,
        total,
        depositAmount,
        status: "Attente Acompte",
        createdAt: serverTimestamp(),
        customer: {
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          phone: form.phone,
          address: form.address,
          deliveryMode: form.deliveryMode,
          date: form.date,
          slot: form.slot,
          notes: form.notes,
        },
      };

      await addDoc(collection(db, "orders"), orderData);

      // Succès immédiat pour éviter d'attendre l'updateDoc (plus optionnel)
      setSuccess(true);
      clearCart();
      window.scrollTo(0, 0);

      // Incrémenter la fidélité en arrière-plan sans bloquer
      if (user?.uid) {
        const userRef = doc(db, "users", user.uid);
        updateDoc(userRef, {
          ordersCount: increment(1)
        }).catch(e => console.error("Erreur fidélité:", e));
      }

    } catch (err) {
      console.error("Booking Error:", err);
      alert("Erreur lors de la réservation. Vérifiez votre connexion et réessayez.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="container-x py-16 sm:py-24 max-w-2xl mx-auto text-center">
        <div className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-full bg-accent/10 text-accent animate-bounce">
          <CheckIcon className="h-12 w-12" />
        </div>
        
        <h1 className="heading-display text-4xl text-primary">Presque fini !</h1>
        <p className="mt-4 text-lg text-primary/70">
          Pour valider votre commande, un acompte de <span className="font-black text-accent">30%</span> est requis.
        </p>

        <div className="mt-10 rounded-3xl bg-primary-gradient bg-grain p-8 text-cream shadow-xl">
          <p className="text-sm uppercase tracking-widest opacity-80">Montant de l&apos;acompte à régler</p>
          <p className="mt-2 text-5xl font-black text-accentSoft">{formatPrice(depositAmount)}</p>
          
          <div className="mt-8 space-y-4 text-left border-t border-cream/10 pt-6">
            <p className="text-sm font-medium flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-[10px] font-bold">1</span>
              Cliquez sur le bouton ci-dessous pour ouvrir l&apos;interface de paiement.
            </p>
            <p className="text-sm font-medium flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-[10px] font-bold">2</span>
              Saisissez manuellement le montant de <strong className="text-accentSoft">{formatPrice(depositAmount)}</strong>.
            </p>
            <p className="text-sm font-medium flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-[10px] font-bold">3</span>
              Validez le règlement par Carte Bancaire. Votre commande sera alors confirmée par SMS.
            </p>
          </div>

          <a 
            href="https://revolut.me/keciataf4" 
            target="_blank" 
            rel="noopener noreferrer"
            className="btn btn-lg bg-white text-primary mt-10 w-full hover:bg-cream transition-all shadow-glow"
          >
            💳 Payer l&apos;acompte par CB
          </a>
        </div>

        <p className="mt-8 text-sm text-primary/50 italic">
          Une fois le paiement effectué, vous pouvez fermer cette page. Nous vous contacterons dès réception.
        </p>

        <div className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link href="/menu" className="btn btn-secondary px-10">Retour au menu</Link>
          {user && <Link href="/mon-compte" className="btn btn-ghost-dark px-10">Mes commandes</Link>}
        </div>
      </div>
    );
  }

  return (
    <div className="container-x py-12 sm:py-20">
      <div className="grid gap-12 lg:grid-cols-2">
        {/* Formulaire */}
        <div className="space-y-8">
          <div>
            <h1 className="heading-display text-3xl text-primary sm:text-4xl">Finaliser ma commande</h1>
            <p className="mt-2 text-primary/70 italic">Vérifiez vos informations avant de confirmer.</p>
          </div>

          <form onSubmit={handleSubmit} className="grid gap-6 sm:grid-cols-2">
            <div className="sm:col-span-2">
               <h2 className="flex items-center gap-2 text-lg font-bold text-primary">
                 <UserIcon className="h-5 w-5 text-accent" /> Vos coordonnées
               </h2>
            </div>
            
            <div>
              <label htmlFor="firstName" className="label">Prénom</label>
              <input
                id="firstName"
                type="text"
                required
                className="field"
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
              />
            </div>
            <div>
              <label htmlFor="lastName" className="label">Nom</label>
              <input
                id="lastName"
                type="text"
                required
                className="field"
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
              />
            </div>
            <div>
              <label htmlFor="phone" className="label">Téléphone</label>
              <input
                id="phone"
                type="tel"
                required
                className="field"
                placeholder="06 00 00 00 00"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <div>
              <label htmlFor="email" className="label">Email (Optionnel)</label>
              <input
                id="email"
                type="email"
                className="field"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>

            <div className="sm:col-span-2 mt-4">
               <h2 className="flex items-center gap-2 text-lg font-bold text-primary">
                 <MapPinIcon className="h-5 w-5 text-accent" /> Livraison ou Retrait
               </h2>
            </div>

            <div className="sm:col-span-2 flex gap-4">
              <button
                type="button"
                onClick={() => setForm({ ...form, deliveryMode: "retrait" })}
                className={`flex-1 rounded-xl border-2 p-4 text-center transition ${
                  form.deliveryMode === "retrait" ? "border-accent bg-accent/5" : "border-cream/30 hover:border-accent/50"
                }`}
              >
                <p className="font-bold text-primary">Retrait sur place</p>
                <p className="text-xs text-primary/60">Gratuit</p>
              </button>
              <button
                type="button"
                onClick={() => setForm({ ...form, deliveryMode: "livraison" })}
                className={`flex-1 rounded-xl border-2 p-4 text-center transition ${
                  form.deliveryMode === "livraison" ? "border-accent bg-accent/5" : "border-cream/30 hover:border-accent/50"
                }`}
              >
                <p className="font-bold text-primary">Livraison</p>
                <p className="text-xs text-primary/60">+{DELIVERY_FEE}€</p>
              </button>
            </div>

            {form.deliveryMode === "livraison" && (
              <div className="sm:col-span-2">
                <label htmlFor="address" className="label">Adresse de livraison</label>
                <input
                  id="address"
                  type="text"
                  required
                  placeholder="Numéro, rue, ville, code postal"
                  className="field"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                />
              </div>
            )}

            <div className="sm:col-span-2 mt-4">
               <h2 className="flex items-center gap-2 text-lg font-bold text-primary">
                 <ClockIcon className="h-5 w-5 text-accent" /> Date et Heure
               </h2>
            </div>

            <div>
              <label htmlFor="date" className="label">Date</label>
              <input
                id="date"
                type="date"
                required
                min={minDate}
                className="field"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </div>
            <div>
              <label htmlFor="slot" className="label">Créneau horaire</label>
              <select
                id="slot"
                required
                className="field bg-white"
                value={form.slot}
                onChange={(e) => setForm({ ...form, slot: e.target.value })}
              >
                <option value="">Choisir...</option>
                <option value="12h00 - 12h30">12h00 - 12h30</option>
                <option value="12h30 - 13h00">12h30 - 13h00</option>
                <option value="13h00 - 13h30">13h00 - 13h30</option>
                <option value="19h00 - 19h30">19h00 - 19h30</option>
                <option value="19h30 - 20h00">19h30 - 20h00</option>
                <option value="20h00 - 20h30">20h00 - 20h30</option>
                <option value="20h30 - 21h00">20h30 - 21h00</option>
              </select>
            </div>

            <div className="sm:col-span-2 mt-4">
              <label htmlFor="notes" className="label text-primary font-bold">Notes ou allergènes (Optionnel)</label>
              <textarea
                id="notes"
                rows={3}
                className="field"
                placeholder="Ex: Pas de piment, code porte 1234..."
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>

            <div className="sm:col-span-2 pt-6">
              <button
                type="submit"
                disabled={!canSubmit || loading}
                className="btn btn-primary w-full py-4 text-lg"
              >
                {loading ? "Confirmation..." : `Confirmer ma commande (${formatPrice(total)})`}
              </button>
              <p className="mt-4 text-center text-xs text-primary/50">
                Paiement sécurisé lors de la livraison ou du retrait.
              </p>
            </div>
          </form>
        </div>

        {/* Récapitulatif */}
        <div className="lg:sticky lg:top-24 h-fit">
          <div className="rounded-3xl bg-creamSoft p-8 shadow-card ring-1 ring-cream/20">
            <h2 className="heading-display text-2xl text-primary">Récapitulatif</h2>
            <div className="mt-8 space-y-4">
              {(cart ?? []).map((item) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span className="text-primary/75">
                    {item.quantity}x <span className="font-bold text-primary">{item.name}</span>
                  </span>
                  <span className="font-bold text-primary">{formatPrice(item.price * item.quantity)}</span>
                </div>
              ))}
            </div>

            <div className="mt-8 border-t border-cream/30 pt-6 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-primary/60">Sous-total</span>
                <span className="font-bold text-primary">{formatPrice(subtotal)}</span>
              </div>
              {form.deliveryMode === "livraison" && (
                <div className="flex justify-between text-sm text-accent">
                  <span>Frais de livraison</span>
                  <span className="font-bold">{formatPrice(DELIVERY_FEE)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-cream/30 pt-4 text-xl">
                <span className="heading-display text-primary">Total</span>
                <span className="font-black text-accent">{formatPrice(total)}</span>
              </div>
              
              <div className="mt-6 rounded-2xl bg-accent p-4 text-white shadow-lg flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Acompte à régler (30%)</p>
                  <p className="text-2xl font-black">{formatPrice(depositAmount)}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
                   <CheckIcon className="h-6 w-6" />
                </div>
              </div>
            </div>

            <div className="mt-10 rounded-2xl bg-white/50 p-4 text-xs text-primary/60 italic leading-relaxed">
              * Une fois la commande confirmée, nous vous appellerons pour valider les derniers détails et l'heure précise.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
