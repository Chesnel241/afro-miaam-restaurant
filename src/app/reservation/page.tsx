"use client";

import { useAuth, useRecaptcha } from "@/components/AuthContext";
import { useCart } from "@/components/CartContext";
import { formatPrice } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { CheckIcon, ClockIcon, MapPinIcon, UserIcon, GiftIcon } from "@/components/Icons";
import { LottiePlayer } from "@/components/LottiePlayer";
import { DELIVERY_FEE } from "@/lib/booking";

export default function ReservationPage() {
  const { cart, subtotal, clearCart } = useCart();
  const { user, loading: authLoading, authFetch } = useAuth();
  const { getToken: getRecaptchaToken } = useRecaptcha();
  const router = useRouter();

  // Redirection vers login si non connecté
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace(`/login?next=${encodeURIComponent("/reservation")}`);
    }
  }, [user, authLoading, router]);

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
  const [finalDeposit, setFinalDeposit] = useState(0);
  // Idempotency key — generated once per real submit attempt and sent as
  // Idempotency-Key. If the server already saw this key for this user, it
  // returns the original order instead of creating a duplicate (covers
  // double-click, two open tabs, network retry, browser back+resubmit).
  // We re-generate on a fresh attempt only AFTER the previous attempt failed.
  const idempotencyKeyRef = useRef<string | null>(null);

  // Growth Features State
  const [referralCode, setReferralCode] = useState("");
  const [useCredits, setUseCredits] = useState(false);
  const [isReferralValid, setIsReferralValid] = useState<boolean | null>(null);
  
  // Promo Codes State
  const [promoCodeInput, setPromoCodeInput] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<{ code: string; discountType: "percentage" | "fixed"; discountValue: number } | null>(null);
  const [promoError, setPromoError] = useState("");
  const [isVerifyingPromo, setIsVerifyingPromo] = useState(false);

  const [blockedDates] = useState<string[]>([]);

  const handleApplyPromo = async () => {
    const enteredCode = promoCodeInput.trim().toUpperCase();
    if (!enteredCode) return;
    setPromoError("");
    setIsVerifyingPromo(true);
    try {
      const recaptchaToken = await getRecaptchaToken("reservation");
      const res = await authFetch("/api/promotions/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: enteredCode, recaptchaToken }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.ok === true && data?.valid === true) {
        setAppliedPromo({
          code: enteredCode,
          discountType: data.discountType,
          discountValue: data.discountValue,
        });
        setPromoCodeInput("");
      } else {
        setPromoError("Code invalide ou inactif.");
      }
    } catch {
      setPromoError("Impossible de vérifier le code.");
    } finally {
      setIsVerifyingPromo(false);
    }
  };

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

  const totalBeforeDiscount = subtotal + (form.deliveryMode === "livraison" ? DELIVERY_FEE : 0);
  
  // Calcul des remises
  const welcomeDiscount = (user && !user.hasUsedWelcomeOffer && user.ordersCount === 0) ? 5 : 0; // 5€ de bienvenue
  
  // Promo code calculation
  let promoDiscount = 0;
  if (appliedPromo) {
    if (appliedPromo.discountType === "percentage") {
      promoDiscount = Math.round((totalBeforeDiscount - welcomeDiscount) * (appliedPromo.discountValue / 100) * 100) / 100;
    } else {
      promoDiscount = appliedPromo.discountValue;
    }
  }

  const creditsToUse = useCredits ? Math.min(user?.referralCredits || 0, totalBeforeDiscount - welcomeDiscount - promoDiscount) : 0;
  
  const total = Math.max(0, totalBeforeDiscount - welcomeDiscount - promoDiscount - creditsToUse);
  const depositAmount = total * 0.5;

  // Calcul de la date minimale (Demain) - Directement au rendu pour éviter le délai d'effet
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user?.id) {
      router.replace(`/login?next=${encodeURIComponent("/reservation")}`);
      return;
    }

    if (form.date < minDate) {
      alert("Désolé, les réservations doivent être effectuées au moins 24h à l'avance. Veuillez choisir une date à partir de demain.");
      return;
    }

    if (blockedDates.includes(form.date)) {
      alert("Désolé, le restaurant est fermé exceptionnellement à cette date. Veuillez choisir un autre jour.");
      return;
    }

    setLoading(true);
    try {
      // The server (/api/reservation) is the source of truth for prices:
      // it reads the menu, rejects unknown items, recomputes the subtotal,
      // and returns the authoritative total + deposit + reference.
      // We send {id, quantity, name, flavor?, image?} and let the server validate.
      const sanitizedItems = cart.map((item) => ({
        id: (item.id || "unknown").split("__")[0],
        quantity: item.quantity || 1,
        name: item.name || "Plat",
        flavor: item.flavor || null,
        image: item.image || "",
      }));

      const recaptchaToken = await getRecaptchaToken("reservation");

      // Pin the idempotency key for the duration of this submit attempt so a
      // network retry of the SAME submission carries the same key (and is
      // de-duplicated server-side). Reset on next successful submit / unmount.
      if (!idempotencyKeyRef.current) {
        idempotencyKeyRef.current =
          typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : `ik-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      }

      const apiRes = await authFetch("/api/reservation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKeyRef.current,
        },
        body: JSON.stringify({
          items: sanitizedItems,
          date: form.date,
          slot: form.slot,
          deliveryMode: form.deliveryMode,
          useCredits,
          useWelcomeOffer: welcomeDiscount > 0,
          referralCode: isReferralValid ? referralCode : undefined,
          promoCode: appliedPromo ? appliedPromo.code : undefined,
          customer: {
            firstName: form.firstName,
            lastName: form.lastName,
            phone: form.phone,
            email: form.email,
            address: form.address,
            notes: form.notes,
          },
          recaptchaToken,
        }),
      });

      const apiData = await apiRes.json().catch(() => ({}));

      if (!apiRes.ok || !apiData?.ok) {
        alert(apiData?.error || "Erreur, réessayez.");
        setLoading(false);
        return;
      }

      const serverDeposit =
        typeof apiData.depositAmount === "number" ? apiData.depositAmount : 0;

      setFinalDeposit(serverDeposit);
      setSuccess(true);
      clearCart();
      // Order succeeded — release the key so a future *new* booking by the
      // same user (after going back to the menu) gets a fresh one.
      idempotencyKeyRef.current = null;
    } catch (err) {
      console.error("BOOKING_ERROR", (err as { code?: string }).code ?? "unknown");
      alert("Erreur, réessayez.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyReferral = async () => {
    // M-2: client-side cross-user query against /users is blocked by the
    // firestore.rules (read: isOwner OR isAdmin), so the previous version
    // always returned snap.empty=true → the validator falsely reported
    // every code as invalid. Until a server-side validator (Admin SDK)
    // is added, accept any non-empty code as a "candidate" — the actual
    // referrerId resolution happens in the order-creation flow on submit
    // (which currently also fails for the same rule reason; the order is
    // recorded with a discounts.referralCodeUsed string but no referrerId
    // until admin reconciles).
    if (!referralCode || referralCode.length < 5) {
      setIsReferralValid(false);
      return;
    }
    setIsReferralValid(true);
  };

  if (success) {
    return (
      <div className="container-x py-16 sm:py-24 max-w-2xl mx-auto text-center">
        <div className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-full bg-accent/10 text-accent animate-bounce">
          <CheckIcon className="h-12 w-12" />
        </div>
        
        <h1 className="heading-display text-4xl text-primary">Presque fini !</h1>
        <p className="mt-4 text-lg text-primary/70">
          Pour valider votre commande, un acompte de <span className="font-black text-accent">50%</span> est requis.
        </p>

        <div className="mt-10 rounded-3xl bg-primary-gradient bg-grain p-8 text-cream shadow-xl">
          <p className="text-sm uppercase tracking-widest opacity-80">Montant de l&apos;acompte à régler</p>
          <p className="mt-2 text-5xl font-black text-accentSoft">{formatPrice(finalDeposit)}</p>
          
          <div className="mt-8 space-y-4 text-left border-t border-cream/10 pt-6">
            <p className="text-sm font-medium flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-[10px] font-bold">1</span>
              Cliquez sur le bouton ci-dessous pour ouvrir l&apos;interface de paiement.
            </p>
            <p className="text-sm font-medium flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-[10px] font-bold">2</span>
              Saisissez manuellement le montant de <strong className="text-accentSoft">{formatPrice(finalDeposit)}</strong>.
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
    <div className="container-x py-12 sm:py-20 relative">
      {loading && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-cream/90 backdrop-blur-sm transition-all duration-300">
          <div className="w-64 h-64">
            <LottiePlayer src="loading chargement confirmation de commande.json" autoplay loop speed={1.2} />
          </div>
          <p className="mt-4 text-xl font-bold text-primary animate-pulse">Validation de votre commande...</p>
        </div>
      )}
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
                className={`field ${blockedDates.includes(form.date) ? 'border-red-500 bg-red-50 text-red-900' : ''}`}
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
              {blockedDates.includes(form.date) && (
                <p className="text-[10px] font-bold text-red-600 mt-1 uppercase tracking-widest">⚠ Le restaurant est fermé à cette date.</p>
              )}
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
                <option value="13h30 - 14h00">13h30 - 14h00</option>
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

            {/* --- Growth Features UI --- */}
            <div className="sm:col-span-2 space-y-4 pt-4 border-t border-cream/30">
              <h3 className="font-display text-lg font-bold text-primary flex items-center gap-2">
                <GiftIcon className="h-5 w-5 text-accent" /> Avantages & Réductions
              </h3>
              
              {user && (user.referralCredits ?? 0) > 0 && (
                <label className="flex items-center gap-3 p-4 rounded-2xl bg-accent/5 border border-accent/10 cursor-pointer group hover:bg-accent/10 transition-colors">
                  <input 
                    type="checkbox" 
                    checked={useCredits} 
                    onChange={e => setUseCredits(e.target.checked)}
                    className="h-5 w-5 rounded border-accent text-accent focus:ring-accent" 
                  />
                  <div className="flex-1">
                    <p className="text-sm font-bold text-primary">Utiliser mes crédits Afro Family</p>
                    <p className="text-xs text-primary/60">Vous avez <span className="text-accent font-bold">{user.referralCredits}€</span> disponibles.</p>
                  </div>
                </label>
              )}

              {(!user || user.ordersCount === 0) && (
                <div className="space-y-2">
                  <label className="label">Code Parrain (Optionnel)</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="Ex: AFRO-JEAN-1234"
                      className={`field flex-1 ${isReferralValid === true ? 'border-green-500 bg-green-50' : isReferralValid === false ? 'border-red-500 bg-red-50' : ''}`}
                      value={referralCode}
                      onChange={e => {
                        setReferralCode(e.target.value.toUpperCase());
                        setIsReferralValid(null);
                      }}
                    />
                    <button 
                      type="button"
                      onClick={handleVerifyReferral}
                      className="btn btn-md bg-primary text-white px-6"
                    >
                      Vérifier
                    </button>
                  </div>
                  {isReferralValid === true && <p className="text-[10px] font-bold text-green-600 uppercase tracking-widest">Code valide ! Récompense activée.</p>}
                  {isReferralValid === false && <p className="text-[10px] font-bold text-red-600 uppercase tracking-widest">Code invalide ou expiré.</p>}
                </div>
              )}
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

              {welcomeDiscount > 0 && (
                <div className="flex justify-between text-sm text-green-600 font-bold">
                  <span>Cadeau de Bienvenue 🎁</span>
                  <span>-{formatPrice(welcomeDiscount)}</span>
                </div>
              )}

              {creditsToUse > 0 && (
                <div className="flex justify-between text-sm text-blue-600 font-bold">
                  <span>Crédits Afro Family 💎</span>
                  <span>-{formatPrice(creditsToUse)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-cream/30 pt-4 text-xl">
                <span className="heading-display text-primary">Total</span>
                <span className="font-black text-accent">{formatPrice(total)}</span>
              </div>
              
              <div className="mt-6 rounded-2xl bg-accent p-4 text-white shadow-lg flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Acompte à régler (50%)</p>
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
