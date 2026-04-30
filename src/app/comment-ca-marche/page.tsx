import Link from "next/link";
import { HowItWorks } from "@/components/HowItWorks";

export const metadata = {
  title: "Comment ça marche",
};

export default function HowItWorksPage() {
  return (
    <>
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
        <div className="container-x grid gap-10 md:grid-cols-2">
          <div className="rounded-lg bg-white p-8 shadow-soft">
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
          <div className="rounded-lg bg-white p-8 shadow-soft">
            <h2 className="font-display text-2xl font-bold text-primary">
              Livraison à Lyon
            </h2>
            <p className="mt-3 text-primary/75">
              On livre dans Lyon pour 2 € seulement. Pratique pour partager
              le repas en famille ou entre collègues.
            </p>
            <ul className="mt-4 space-y-2 text-sm text-primary/75">
              <li>• 2 € de frais de livraison</li>
              <li>• Tous les arrondissements de Lyon</li>
              <li>• Fenêtre confirmée par téléphone</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="container-x rounded-xl bg-primary p-8 text-cream shadow-soft sm:p-12">
          <h2 className="heading-display text-3xl sm:text-4xl">
            Et le paiement&nbsp;?
          </h2>
          <p className="mt-3 max-w-2xl text-cream/85">
            Pour cette première version, le paiement n&apos;est pas en ligne.
            Après votre réservation, notre équipe vous rappelle pour confirmer
            les détails et finaliser le paiement par téléphone. C&apos;est
            simple, humain, et ça nous permet de vous garantir une cuisine
            préparée juste pour vous.
          </p>
          <div className="mt-6">
            <Link href="/menu" className="btn btn-md btn-primary">
              Composer ma commande
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
