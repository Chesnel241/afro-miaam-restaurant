import type { Metadata } from "next";
import { JsonLd } from "@/components/JsonLd";
import { breadcrumbJsonLd, SITE_URL } from "@/lib/seo";

export const metadata: Metadata = {
  title: "À propos — L'histoire d'Afro Miaam",
  description:
    "La rencontre entre les saveurs authentiques de l'Afrique et le raffinement de la gastronomie française. Découvrez notre histoire et nos valeurs.",
  alternates: { canonical: "/a-propos" },
  openGraph: {
    title: "À propos d'Afro Miaam",
    description:
      "Saveurs africaines authentiques et raffinement gastronomique français.",
    url: "/a-propos",
  },
};

const aboutPageJsonLd = {
  "@context": "https://schema.org",
  "@type": "AboutPage",
  url: `${SITE_URL}/a-propos`,
  name: "À propos d'Afro Miaam",
  about: { "@id": `${SITE_URL}/#restaurant` },
};

export default function AProposLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <JsonLd data={aboutPageJsonLd} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Accueil", path: "/" },
          { name: "À propos", path: "/a-propos" },
        ])}
      />
    </>
  );
}
