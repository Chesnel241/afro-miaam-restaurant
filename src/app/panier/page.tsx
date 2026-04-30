"use client";

import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/components/CartContext";
import { formatPrice } from "@/lib/utils";
import { DELIVERY_FEE } from "@/lib/booking";
import {
  CalendarIcon,
  MinusIcon,
  PlusIcon,
  TrashIcon,
  TruckIcon,
} from "@/components/Icons";

export default function CartPage() {
  const {
    lines,
    subtotal,
    deliveryMode,
    deliveryFee,
    total,
    setQuantity,
    removeItem,
    setDeliveryMode,
  } = useCart();

  const empty = lines.length === 0;

  return (
    <section className="py-12 sm:py-16">
      <div className="container-x">
        <p className="eyebrow">Panier</p>
        <h1 className="heading-display mt-2 text-3xl text-primary sm:text-4xl lg:text-5xl">
          Votre commande
        </h1>

        {empty ? (
          <div className="mt-10 rounded-2xl bg-white p-10 text-center shadow-card">
            <p className="font-display text-2xl text-primary">
              Votre panier est vide.
            </p>
            <p className="mt-2 text-primary/70">
              Parcourez la carte et ajoutez vos plats préférés.
            </p>
            <Link href="/menu" className="btn btn-md btn-primary mt-6">
              Découvrir le menu
            </Link>
          </div>
        ) : (
          <div className="mt-10 grid gap-8 lg:grid-cols-[1.5fr_1fr]">
            <ul className="space-y-4">
              {lines.map((line) => (
                <li
                  key={line.id}
                  className="flex flex-col gap-4 rounded-2xl bg-white p-4 shadow-card sm:flex-row sm:items-center"
                >
                  <div className="relative h-24 w-full overflow-hidden rounded-xl bg-creamSoft sm:h-20 sm:w-20 sm:shrink-0">
                    <Image
                      src={line.image}
                      alt={line.name}
                      fill
                      sizes="(min-width: 640px) 80px, 100vw"
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-display text-lg font-bold text-primary">
                      {line.name}
                    </h3>
                    <p className="text-sm text-primary/60">
                      {formatPrice(line.price)} l&apos;unité
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-3 sm:flex-nowrap sm:justify-end">
                    <div className="inline-flex items-center rounded-full border border-primary/15 bg-creamSoft">
                      <button
                        type="button"
                        onClick={() => setQuantity(line.id, line.quantity - 1)}
                        aria-label="Réduire la quantité"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-full text-primary hover:bg-primary/5"
                      >
                        <MinusIcon className="h-4 w-4" />
                      </button>
                      <span className="min-w-8 text-center font-bold text-primary">
                        {line.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => setQuantity(line.id, line.quantity + 1)}
                        aria-label="Augmenter la quantité"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-full text-primary hover:bg-primary/5"
                      >
                        <PlusIcon className="h-4 w-4" />
                      </button>
                    </div>
                    <span className="font-display text-lg font-bold text-accent">
                      {formatPrice(line.price * line.quantity)}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeItem(line.id)}
                      aria-label={`Retirer ${line.name}`}
                      className="text-primary/50 transition hover:text-afro-red"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            <aside className="space-y-6">
              <div className="rounded-2xl bg-white p-6 shadow-card">
                <h2 className="font-display text-xl font-bold text-primary">
                  Mode de réception
                </h2>
                <div className="mt-4 grid gap-3">
                  <ModeOption
                    selected={deliveryMode === "retrait"}
                    onSelect={() => setDeliveryMode("retrait")}
                    title="Retrait sur place"
                    sub="Adresse envoyée après validation"
                    price="Gratuit"
                  />
                  <ModeOption
                    selected={deliveryMode === "livraison"}
                    onSelect={() => setDeliveryMode("livraison")}
                    title="Livraison à Lyon"
                    sub="Tous les arrondissements de Lyon"
                    price={`${DELIVERY_FEE} €`}
                  />
                </div>
              </div>

              <div className="rounded-2xl bg-primary-gradient p-6 text-cream shadow-soft bg-grain">
                <h2 className="font-display text-xl font-bold">Récapitulatif</h2>
                <dl className="mt-4 space-y-2 text-sm">
                  <Row label="Sous-total" value={formatPrice(subtotal)} />
                  <Row
                    label={
                      deliveryMode === "livraison" ? "Livraison Lyon" : "Retrait"
                    }
                    value={deliveryFee === 0 ? "Gratuit" : formatPrice(deliveryFee)}
                  />
                </dl>
                <div className="mt-4 flex items-center justify-between border-t border-cream/15 pt-4">
                  <span className="font-display text-lg">Total</span>
                  <span className="font-display text-2xl font-extrabold text-accentSoft">
                    {formatPrice(total)}
                  </span>
                </div>
                <p className="mt-3 flex items-start gap-2 text-xs text-cream/75">
                  <TruckIcon className="mt-0.5 h-4 w-4 shrink-0 text-accentSoft" />
                  Paiement après validation par téléphone. Le total ci-dessus
                  est purement indicatif.
                </p>
                <Link
                  href="/reservation"
                  className="btn btn-lg btn-primary mt-6 w-full"
                >
                  <CalendarIcon className="h-5 w-5" />
                  Choisir la date et l&apos;heure
                </Link>
                <Link
                  href="/menu"
                  className="mt-3 block text-center text-sm text-cream/80 underline-offset-4 hover:underline"
                >
                  Continuer mes achats
                </Link>
              </div>
            </aside>
          </div>
        )}
      </div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-cream/85">
      <dt>{label}</dt>
      <dd className="font-semibold">{value}</dd>
    </div>
  );
}

function ModeOption({
  selected,
  onSelect,
  title,
  sub,
  price,
}: {
  selected: boolean;
  onSelect: () => void;
  title: string;
  sub: string;
  price: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`flex items-center justify-between gap-4 rounded-xl border p-4 text-left transition focus-ring ${
        selected
          ? "border-accent bg-accent/5"
          : "border-primary/15 bg-creamSoft hover:border-primary/30"
      }`}
    >
      <div>
        <p className="font-display text-base font-bold text-primary">{title}</p>
        <p className="text-sm text-primary/65">{sub}</p>
      </div>
      <span className="font-display text-lg font-bold text-accent">{price}</span>
    </button>
  );
}
