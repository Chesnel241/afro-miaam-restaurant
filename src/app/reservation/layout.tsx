import type { Metadata } from "next";
import { JsonLd } from "@/components/JsonLd";
import { breadcrumbJsonLd } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Réservation & commande — Afro Miaam Lyon",
  description:
    "Commandez vos plats africains dès aujourd'hui avec 3 h de marge minimum, choisissez votre créneau, livraison à 3 € dans Lyon ou retrait gratuit. Acompte 50%, paiement après validation.",
  alternates: { canonical: "/reservation" },
  openGraph: {
    title: "Réserver mes plats Afro Miaam",
    description:
      "Commande même jour, 3 h de marge. Livraison Lyon ou retrait. Paiement après validation.",
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
