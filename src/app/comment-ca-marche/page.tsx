import Link from "next/link";
import type { Metadata } from "next";
import { HowItWorks } from "@/components/HowItWorks";
import { JsonLd } from "@/components/JsonLd";
import { breadcrumbJsonLd, SITE_URL } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Comment ça marche — Précommander chez Afro Miaam",
  description:
    "Précommande 24h, choix du créneau, retrait gratuit ou livraison à 3 € dans Lyon. Paiement par téléphone après validation. Le mode d'emploi en 3 étapes.",
  alternates: { canonical: "/comment-ca-marche" },
  openGraph: {
    title: "Comment commander chez Afro Miaam",
    description: "Précommande 24h, retrait ou livraison Lyon.",
    url: "/comment-ca-marche",
  },
};

const howToJsonLd = {
  "@context": "https://schema.org",
  "@type": "HowTo",
  name: "Comment précommander chez Afro Miaam",
  description:
    "Précommander vos plats africains en 3 étapes : composer le panier, choisir un créneau au moins 24h à l'avance, payer après validation par téléphone.",
  totalTime: "PT5M",
  step: [
    {
      "@type": "HowToStep",
      position: 1,
      name: "Composez votre panier",
      text: "Parcourez le menu et ajoutez les plats souhaités au panier.",
      url: `${SITE_URL}/menu`,
    },
    {
      "@type": "HowToStep",
      position: 2,
      name: "Choisissez un créneau",
      text: "Sélectionnez votre créneau au minimum 24h à l'avance et le mode (retrait ou livraison à 3 € dans Lyon).",
      url: `${SITE_URL}/reservation`,
    },
    {
      "@type": "HowToStep",
      position: 3,
      name: "Validation par téléphone",
      text: "Notre équipe vous rappelle pour confirmer la commande et finaliser le paiement.",
    },
  ],
};

export default function HowItWorksPage() {
  return (
    <>
      <JsonLd data={howToJsonLd} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Accueil", path: "/" },
          { name: "Comment ça marche", path: "/comment-ca-marche" },
        ])}
      />
      <section className="bg-primary pt-10 pb-10 text-cream sm:pt-16 sm:pb-12">
        <div className="container-x">
          <p className="eyebrow text-accentSoft">Mode d&apos;emploi</p>
          <h1 className="heading-display mt-3 text-3xl sm:text-4xl lg:text-6xl">
            Précommande Afro Miaam, en 3 étapes claires.
          </h1>
          <p className="mt-4 max-w-2xl text-cream/85">
            Pour vous offrir une cuisine fraîche et préparée à la demande, on
            vous demande un peu d&apos;avance. Voici comment ça se passe.
          </p>
        </div>
      </section>

      <HowItWorks withCta={false} />

      <section className="bg-creamSoft py-16">
        <div className="container-x grid gap-10 md:grid-cols-2 xl:gap-16">
          <div className="rounded-lg bg-white p-8 xl:p-12 shadow-soft">
            <h2 className="font-display text-2xl font-bold text-primary">
              Retrait sur place
            </h2>
            <p className="mt-3 text-primary/75">
              Récupérez votre commande au créneau choisi. L&apos;adresse exacte
              vous est communiquée après validation par téléphone.
            </p>
            <ul className="mt-4 space-y-2 text-sm text-primary/75">
              <li>• Gratuit</li>
              <li>• Créneaux midi & soir</li>
              <li>• Aucune attente, votre commande est prête</li>
            </ul>
          </div>
          <div className="rounded-lg bg-white p-8 xl:p-12 shadow-soft">
            <h2 className="font-display text-2xl font-bold text-primary">
              Livraison à Lyon
            </h2>
            <p className="mt-3 text-primary/75">
              On livre dans Lyon pour 3 € seulement. Pratique pour partager
              le repas en famille ou entre collègues.
            </p>
            <ul className="mt-4 space-y-2 text-sm text-primary/75">
              <li>• 3 € de frais de livraison</li>
              <li>• Tous les arrondissements de Lyon</li>
              <li>• Fenêtre confirmée par téléphone</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="container-x rounded-xl bg-primary p-8 text-cream shadow-soft sm:p-12 xl:p-16">
          <h2 className="heading-display text-3xl sm:text-4xl">
            Et le paiement&nbsp;?
          </h2>
          <p className="mt-3 max-w-2xl xl:max-w-3xl text-cream/85">
            Pour cette première version, le paiement n&apos;est pas en ligne.
            Après votre réservation, notre équipe vous rappelle pour confirmer
            les détails et finaliser le paiement par téléphone. C&apos;est
            simple, humain, et ça nous permet de vous garantir une cuisine
            préparée juste pour vous.
          </p>
          <div className="mt-6">
            <Link href="/menu" className="btn btn-md btn-primary">
              Commander maintenant
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
