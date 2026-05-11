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

const DELIVERY_FEE = 2.5;

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setLoading(true);
    try {
      const orderData = {
        userId: user?.uid || null,
        items: cart,
        subtotal,
        deliveryFee: form.deliveryMode === "livraison" ? DELIVERY_FEE : 0,
        total,
        status: "En attente",
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

      // Si client connecté, incrémenter son compteur de fidélité
      if (user?.uid) {
        const userRef = doc(db, "users", user.uid);
        await updateDoc(userRef, {
          ordersCount: increment(1)
        });
      }

      setSuccess(true);
      clearCart();
      window.scrollTo(0, 0);
    } catch (err) {
      alert("Erreur lors de la réservation. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="container-x py-20 text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100 text-green-600">
          <CheckIcon className="h-10 w-10" />
        </div>
        <h1 className="heading-display text-3xl text-primary sm:text-4xl">Commande reçue !</h1>
        <p className="mt-4 text-primary/75">
          Merci <strong className="text-primary">{form.firstName}</strong>. Nous vous appellerons au{" "}
          <strong className="text-primary">{form.phone}</strong> pour confirmer votre commande.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link href="/menu" className="btn btn-primary px-10">Retour au menu</Link>
          {user && <Link href="/mon-compte" className="btn btn-secondary px-10">Suivre ma commande</Link>}
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
              {cart.map((item) => (
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
