import Link from "next/link";

export const metadata = {
  title: "FAQ",
};

const FAQ = [
  {
    q: "Comment fonctionne la commande ?",
    a: "Vous composez votre panier sur le site et choisissez un créneau au minimum 24h à l'avance. Notre équipe vous rappelle ensuite pour confirmer et finaliser le paiement.",
  },
  {
    q: "Puis-je me faire livrer ?",
    a: "Oui. Nous livrons dans Lyon pour 2 € seulement. Vous renseignez votre adresse au moment de la réservation.",
  },
  {
    q: "Puis-je retirer ma commande ?",
    a: "Bien sûr. Le retrait est gratuit. L'adresse exacte vous est communiquée par téléphone après validation de votre commande.",
  },
  {
    q: "Pourquoi commander 24h à l'avance ?",
    a: "Pour vous garantir une cuisine fraîche, préparée spécialement pour vous. Cela nous permet de sélectionner les bons produits et d'éviter le gaspillage.",
  },
  {
    q: "Comment je paie ?",
    a: "Pour cette première version, le paiement se fait par téléphone après validation de votre commande. Aucun paiement n'est demandé sur le site.",
  },
  {
    q: "Je n'ai pas reçu d'appel, que faire ?",
    a: "Si vous n'avez pas été contacté dans la demi-journée, vérifiez votre numéro et écrivez-nous via la page contact. Nous reviendrons vers vous au plus vite.",
  },
  {
    q: "Puis-je modifier ou annuler ma réservation ?",
    a: "Oui, jusqu'à 24h avant le créneau choisi. Contactez-nous par téléphone ou via la page contact pour ajuster votre commande.",
  },
];

export default function FaqPage() {
  return (
    <>
      <section className="bg-primary pt-12 pb-10 text-cream sm:pt-16">
        <div className="container-x">
          <p className="eyebrow text-accentSoft">Questions fréquentes</p>
          <h1 className="heading-display mt-3 text-4xl sm:text-5xl lg:text-6xl">
            On répond à tout, sans détour.
          </h1>
          <p className="mt-4 max-w-2xl text-cream/85">
            Une question sur la commande, la livraison ou le paiement ?
            La réponse est probablement ici.
          </p>
        </div>
      </section>

      <section className="py-16">
        <div className="container-x max-w-3xl space-y-3">
          {FAQ.map((item) => (
            <details
              key={item.q}
              className="group rounded-lg bg-white p-5 shadow-soft transition open:shadow-glow/50"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
                <span className="font-display text-lg font-bold text-primary">
                  {item.q}
                </span>
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-creamSoft text-xl text-accent transition group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="mt-3 text-primary/75">{item.a}</p>
            </details>
          ))}

          <div className="mt-8 rounded-lg border border-accent/20 bg-creamSoft p-6 text-center">
            <p className="font-display text-xl text-primary">
              Une autre question&nbsp;?
            </p>
            <p className="mt-2 text-primary/70">
              Écrivez-nous, on est là.
            </p>
            <Link href="/contact" className="btn btn-md btn-primary mt-4">
              Nous contacter
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
