import type { Metadata } from "next";
import { JsonLd } from "@/components/JsonLd";
import { menuJsonLd, breadcrumbJsonLd } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Menu africain à Lyon — Yassa, Mafé, Tièp, Garba",
  description:
    "Découvrez le menu Afro Miaam : signatures, plats africains, entrées, accompagnements, desserts et boissons. Commande même jour avec 3 h de marge, retrait ou livraison à Lyon.",
  alternates: { canonical: "/menu" },
  openGraph: {
    title: "Menu Afro Miaam — Cuisine africaine à Lyon",
    description:
      "Yassa, Mafé, Tièp, Garba, Bissap… Le meilleur de la cuisine africaine, à commander dès aujourd'hui pour un retrait ou une livraison à Lyon.",
    url: "/menu",
  },
};

export default function MenuLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <JsonLd data={menuJsonLd()} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Accueil", path: "/" },
          { name: "Menu", path: "/menu" },
        ])}
      />
    </>
  );
}
