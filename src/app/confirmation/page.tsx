"use client";

import Link from "next/link";
import { useState } from "react";
import { formatHumanDate } from "@/lib/booking";
import { formatPrice } from "@/lib/utils";
import { CheckIcon, PhoneIcon } from "@/components/Icons";

type SavedReservation = {
  reference: string;
  date: string;
  slot: string;
  deliveryMode: "retrait" | "livraison";
  customer: { firstName: string; lastName: string; phone: string; email?: string; address?: string };
  total: number;
};

export default function ConfirmationPage() {
  const [data] = useState<SavedReservation | null>(() => {
    try {
      const raw = sessionStorage.getItem("afro-miaam-last-reservation");
      return raw ? (JSON.parse(raw) as SavedReservation) : null;
    } catch {
      return null;
    }
  });

  return (
    <section className="py-16 sm:py-20">
      <div className="container-x max-w-3xl">
        <div className="rounded-2xl bg-white p-8 text-center shadow-card sm:p-12">
          <div className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-full bg-accent text-white">
            <CheckIcon className="h-8 w-8" />
          </div>
          <p className="eyebrow mt-4">Réservation envoyée</p>
          <h1 className="heading-display mt-3 text-3xl text-primary sm:text-4xl lg:text-5xl">
            Merci, c&apos;est noté&nbsp;!
          </h1>
          <p className="mt-4 inline-flex items-center gap-2 text-lg text-primary/75">
            <PhoneIcon className="h-5 w-5 text-accent" />
            Nous vous contactons rapidement pour finaliser votre commande.
          </p>

          {data && (
            <div className="mx-auto mt-8 max-w-xl rounded-xl bg-creamSoft p-6 text-left">
              <Row label="Référence" value={data.reference} />
              <Row label="Date" value={formatHumanDate(data.date)} />
              <Row label="Créneau" value={data.slot} />
              <Row
                label="Mode"
                value={data.deliveryMode === "livraison" ? "Livraison à Lyon" : "Retrait sur place"}
              />
              {data.deliveryMode === "livraison" && data.customer.address && (
                <Row label="Adresse" value={data.customer.address} />
              )}
              <Row label="Téléphone" value={data.customer.phone} />
              <Row label="Total indicatif" value={formatPrice(data.total)} highlight />
            </div>
          )}

          <p className="mt-8 text-sm text-primary/60">
            {data?.deliveryMode === "retrait"
              ? "Une fois validée, l'adresse exacte de retrait vous sera communiquée par téléphone."
              : "Notre équipe vous rappelle pour confirmer la fenêtre de livraison."}
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/menu" className="btn btn-md btn-primary">
              Retour au menu
            </Link>
            <Link href="/" className="btn btn-md btn-ghost-dark">
              Accueil
            </Link>
          </div>
        </div>

        <p className="mt-8 text-center font-display text-xl font-extrabold text-primary">
          Ça mijote, ça régale.
        </p>
      </div>
    </section>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-primary/10 py-2 last:border-0">
      <span className="text-sm font-semibold text-primary/65">{label}</span>
      <span
        className={`font-display ${
          highlight ? "text-lg font-bold text-accent" : "text-base text-primary"
        }`}
      >
        {value}
      </span>
    </div>
  );
}
