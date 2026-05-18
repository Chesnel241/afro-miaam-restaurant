import type { Metadata } from "next";
import { JsonLd } from "@/components/JsonLd";
import { breadcrumbJsonLd, RESTAURANT_INFO, SITE_URL } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Contact — Nous écrire ou nous appeler",
  description:
    "Une question, un événement ? Contactez Afro Miaam à Lyon. Téléphone, email, formulaire de contact. Réponse sous 24h.",
  alternates: { canonical: "/contact" },
  openGraph: {
    title: "Contact Afro Miaam",
    description: "Téléphone, email et formulaire de contact. Lyon, France.",
    url: "/contact",
  },
};

const contactPageJsonLd = {
  "@context": "https://schema.org",
  "@type": "ContactPage",
  url: `${SITE_URL}/contact`,
  name: "Contact Afro Miaam",
  mainEntity: {
    "@type": "Organization",
    name: RESTAURANT_INFO.name,
    telephone: RESTAURANT_INFO.telephone,
    email: RESTAURANT_INFO.email,
    address: {
      "@type": "PostalAddress",
      ...RESTAURANT_INFO.address,
    },
  },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <JsonLd data={contactPageJsonLd} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Accueil", path: "/" },
          { name: "Contact", path: "/contact" },
        ])}
      />
    </>
  );
}
