import type { Metadata } from "next";
import { JsonLd } from "@/components/JsonLd";
import { serviceJsonLd, breadcrumbJsonLd } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Prestations & événements — Traiteur africain à Lyon",
  description:
    "Plateaux repas business, mariages, baptêmes, anniversaires, chef à domicile. Afro Miaam s'occupe de votre événement à Lyon avec une cuisine africaine d'exception.",
  alternates: { canonical: "/prestations" },
  openGraph: {
    title: "Prestations Afro Miaam — Traiteur africain événements à Lyon",
    description:
      "Corporate, célébrations privées, chef à domicile. Devis instantané et menu sur-mesure.",
    url: "/prestations",
  },
};

export default function PrestationsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <JsonLd data={serviceJsonLd()} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Accueil", path: "/" },
          { name: "Prestations", path: "/prestations" },
        ])}
      />
    </>
  );
}
