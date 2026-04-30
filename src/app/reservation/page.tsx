"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "@/components/CartContext";
import { TIME_SLOTS, formatHumanDate, minBookingDate } from "@/lib/booking";
import { formatPrice } from "@/lib/utils";

type FormState = {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
};

const EMPTY_FORM: FormState = {
  firstName: "",
  lastName: "",
  phone: "",
  email: "",
  address: "",
  notes: "",
};

export default function ReservationPage() {
  const router = useRouter();
  const {
    lines,
    subtotal,
    deliveryMode,
    deliveryFee,
    total,
    clear,
  } = useCart();

  const [date, setDate] = useState("");
  const [slot, setSlot] = useState("");
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const minDate = useMemo(() => minBookingDate(), []);

  useEffect(() => {
    if (!date) setDate(minDate);
  }, [date, minDate]);

  const canSubmit =
    lines.length > 0 &&
    !!date &&
    !!slot &&
    form.firstName.trim() &&
    form.lastName.trim() &&
    form.phone.trim().length >= 8 &&
    (deliveryMode !== "livraison" || form.address.trim().length > 5);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        items: lines,
        deliveryMode,
        deliveryFee,
        subtotal,
        total,
        date,
        slot,
        customer: {
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          phone: form.phone.trim(),
          email: form.email.trim() || undefined,
          address: deliveryMode === "livraison" ? form.address.trim() : undefined,
          notes: form.notes.trim() || undefined,
        },
      };
      const res = await fetch("/api/reservation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Échec de l'envoi.");
      }
      const data = (await res.json()) as { reference: string };

      try {
        sessionStorage.setItem(
          "afro-miaam-last-reservation",
          JSON.stringify({
            reference: data.reference,
            date,
            slot,
            deliveryMode,
            customer: payload.customer,
            total,
          }),
        );
      } catch {
        /* ignore */
      }

      clear();
      router.push("/confirmation");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue.");
    } finally {
      setSubmitting(false);
    }
  }

  if (lines.length === 0) {
    return (
      <section className="py-20">
        <div className="container-x text-center">
          <p className="eyebrow">Réservation</p>
          <h1 className="heading-display mt-2 text-4xl text-afro-green sm:text-5xl">
            Votre panier est vide
          </h1>
          <p className="mt-3 text-afro-black/70">
            Choisissez d&apos;abord vos plats avant de réserver un créneau.
          </p>
          <Link href="/menu" className="btn btn-md btn-primary mt-6">
            Voir le menu
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="py-12 sm:py-16">
      <div className="container-x">
        <p className="eyebrow">Réservation</p>
        <h1 className="heading-display mt-2 text-4xl text-afro-green sm:text-5xl">
          Date, heure et coordonnées
        </h1>
        <p className="mt-3 max-w-2xl text-afro-black/75">
          Commande à l&apos;avance — paiement après validation par téléphone.
          Choisissez votre créneau, on s&apos;occupe du reste.
        </p>

        <form
          onSubmit={handleSubmit}
          className="mt-10 grid gap-8 lg:grid-cols-[1.3fr_1fr]"
        >
          <div className="space-y-6">
            <fieldset className="rounded-lg bg-white p-6 shadow-soft">
              <legend className="font-display text-xl font-bold text-afro-green">
                Date de retrait ou livraison
              </legend>
              <p className="mt-1 text-sm text-afro-black/65">
                Minimum 24h à l&apos;avance — la première date disponible est
                {" "}
                <span className="font-semibold text-afro-green">
                  {formatHumanDate(minDate)}
                </span>
                .
              </p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Field label="Date" htmlFor="date" required>
                  <input
                    id="date"
                    type="date"
                    min={minDate}
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                    className="input"
                  />
                </Field>
                <Field label="Mode" htmlFor="mode">
                  <input
                    id="mode"
                    type="text"
                    readOnly
                    value={deliveryMode === "livraison" ? "Livraison à Lyon" : "Retrait sur place"}
                    className="input bg-afro-cream-soft"
                  />
                </Field>
              </div>

              <div className="mt-6">
                <p className="font-display text-base font-bold text-afro-green">
                  Choisir un créneau
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {TIME_SLOTS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSlot(s)}
                      aria-pressed={slot === s}
                      className={`min-h-12 rounded-full border px-3 text-sm font-semibold transition focus-ring ${
                        slot === s
                          ? "border-afro-orange bg-afro-orange text-white"
                          : "border-afro-green/15 bg-afro-cream-soft text-afro-green hover:border-afro-green/40"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </fieldset>

            <fieldset className="rounded-lg bg-white p-6 shadow-soft">
              <legend className="font-display text-xl font-bold text-afro-green">
                Vos coordonnées
              </legend>
              <p className="mt-1 text-sm text-afro-black/65">
                C&apos;est sur ce numéro qu&apos;on vous rappelle pour finaliser.
              </p>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Field label="Prénom" htmlFor="firstName" required>
                  <input
                    id="firstName"
                    type="text"
                    autoComplete="given-name"
                    required
                    value={form.firstName}
                    onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                    className="input"
                  />
                </Field>
                <Field label="Nom" htmlFor="lastName" required>
                  <input
                    id="lastName"
                    type="text"
                    autoComplete="family-name"
                    required
                    value={form.lastName}
                    onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
                    className="input"
                  />
                </Field>
                <Field label="Téléphone" htmlFor="phone" required>
                  <input
                    id="phone"
                    type="tel"
                    autoComplete="tel"
                    required
                    placeholder="06 12 34 56 78"
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    className="input"
                  />
                </Field>
                <Field label="Email (optionnel)" htmlFor="email">
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    className="input"
                  />
                </Field>
                {deliveryMode === "livraison" && (
                  <Field label="Adresse de livraison (Lyon)" htmlFor="address" required full>
                    <input
                      id="address"
                      type="text"
                      autoComplete="street-address"
                      required
                      placeholder="12 rue de la République, 69002 Lyon"
                      value={form.address}
                      onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                      className="input"
                    />
                  </Field>
                )}
                <Field label="Note (allergies, occasion…)" htmlFor="notes" full>
                  <textarea
                    id="notes"
                    rows={3}
                    value={form.notes}
                    onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                    className="input min-h-[88px] resize-y py-3"
                  />
                </Field>
              </div>
            </fieldset>
          </div>

          <aside className="space-y-4">
            <div className="rounded-lg bg-afro-green p-6 text-afro-cream shadow-soft">
              <h2 className="font-display text-xl font-bold">Votre commande</h2>
              <ul className="mt-4 space-y-2 text-sm">
                {lines.map((l) => (
                  <li key={l.id} className="flex items-start justify-between gap-4">
                    <span className="text-afro-cream/85">
                      {l.quantity} × {l.name}
                    </span>
                    <span className="whitespace-nowrap font-semibold">
                      {formatPrice(l.price * l.quantity)}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-4 space-y-1 border-t border-afro-cream/15 pt-4 text-sm text-afro-cream/80">
                <div className="flex items-center justify-between">
                  <span>Sous-total</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>{deliveryMode === "livraison" ? "Livraison Lyon" : "Retrait"}</span>
                  <span>{deliveryFee === 0 ? "Gratuit" : formatPrice(deliveryFee)}</span>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-afro-cream/15 pt-3">
                <span className="font-display text-lg">Total</span>
                <span className="font-display text-2xl font-bold text-afro-orange-soft">
                  {formatPrice(total)}
                </span>
              </div>
              <p className="mt-3 text-xs text-afro-cream/70">
                Paiement à finaliser au téléphone après confirmation de votre
                commande par notre équipe.
              </p>
            </div>

            {error && (
              <p className="rounded-md border border-afro-red/30 bg-afro-red/10 p-3 text-sm text-afro-red">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={!canSubmit || submitting}
              className="btn btn-lg btn-primary w-full"
            >
              {submitting ? "Envoi en cours…" : "Réserver — on vous rappelle"}
            </button>
            <p className="text-center text-xs text-afro-black/55">
              En réservant, vous acceptez d&apos;être recontacté pour
              finaliser votre commande.
            </p>
          </aside>
        </form>
      </div>

      <style jsx>{`
        :global(.input) {
          width: 100%;
          min-height: 48px;
          border-radius: 12px;
          border: 1px solid rgba(31, 61, 43, 0.15);
          background: #fff;
          padding: 0 14px;
          color: #1a1a1a;
          font-size: 16px;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        :global(.input:focus-visible) {
          outline: none;
          border-color: #e85d2a;
          box-shadow: 0 0 0 4px rgba(232, 93, 42, 0.18);
        }
      `}</style>
    </section>
  );
}

function Field({
  label,
  htmlFor,
  required,
  full,
  children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  full?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className={`flex flex-col gap-1.5 ${full ? "sm:col-span-2" : ""}`}
    >
      <span className="text-sm font-semibold text-afro-green">
        {label} {required && <span className="text-afro-orange">*</span>}
      </span>
      {children}
    </label>
  );
}
