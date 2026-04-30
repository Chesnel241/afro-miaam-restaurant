"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatHumanDate } from "@/lib/booking";
import { formatPrice } from "@/lib/utils";

type SavedReservation = {
  reference: string;
  date: string;
  slot: string;
  deliveryMode: "retrait" | "livraison";
  customer: { firstName: string; lastName: string; phone: string; email?: string; address?: string };
  total: number;
};

export default function ConfirmationPage() {
  const [data, setData] = useState<SavedReservation | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("afro-miaam-last-reservation");
      if (raw) setData(JSON.parse(raw));
    } catch {
      /* ignore */
    }
    setLoaded(true);
  }, []);

  return (
    <section className="py-16 sm:py-20">
      <div className="container-x max-w-3xl">
        <div className="rounded-xl bg-white p-8 text-center shadow-soft sm:p-12">
          <div className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-full bg-afro-orange/15 text-3xl text-afro-orange">
            ✓
          </div>
          <p className="eyebrow mt-4">Réservation envoyée</p>
          <h1 className="heading-display mt-3 text-4xl text-afro-green sm:text-5xl">
            Merci, c&apos;est noté&nbsp;!
          </h1>
          <p className="mt-4 text-lg text-afro-black/75">
            Nous vous contactons rapidement pour finaliser votre commande et
            confirmer le paiement par téléphone.
          </p>

          {loaded && data && (
            <div className="mx-auto mt-8 max-w-xl rounded-lg bg-afro-cream-soft p-6 text-left">
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

          <p className="mt-8 text-sm text-afro-black/60">
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

        <p className="mt-8 text-center font-display text-xl text-afro-green">
          Ça mijote, ça régale.
        </p>
      </div>
    </section>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-afro-green/10 py-2 last:border-0">
      <span className="text-sm font-semibold text-afro-black/65">{label}</span>
      <span
        className={`font-display ${
          highlight ? "text-lg font-bold text-afro-orange" : "text-base text-afro-green"
        }`}
      >
        {value}
      </span>
    </div>
  );
}
