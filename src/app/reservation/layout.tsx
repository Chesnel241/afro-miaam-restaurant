import type { Metadata } from "next";
import { JsonLd } from "@/components/JsonLd";
import { breadcrumbJsonLd } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Réservation & précommande — Afro Miaam Lyon",
  description:
    "Précommandez vos plats africains 24h à l'avance, choisissez votre créneau, livraison à 3 € dans Lyon ou retrait gratuit. Acompte 50%, paiement après validation.",
  alternates: { canonical: "/reservation" },
  openGraph: {
    title: "Réserver mes plats Afro Miaam",
    description:
      "Précommande 24h. Livraison Lyon ou retrait. Paiement après validation.",
    url: "/reservation",
  },
};

export default function ReservationLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Accueil", path: "/" },
          { name: "Réservation", path: "/reservation" },
        ])}
      />
    </>
  );
}
