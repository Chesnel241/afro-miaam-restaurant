export const metadata = { title: "Conditions générales de vente" };

export default function CgvPage() {
  return (
    <section className="py-16">
      <div className="container-x max-w-3xl space-y-6 rounded-lg bg-white p-8 shadow-soft sm:p-12">
        <p className="eyebrow">Légal</p>
        <h1 className="heading-display text-4xl text-primary sm:text-5xl">
          Conditions générales de vente
        </h1>

        <Block title="Objet">
          Les présentes CGV régissent les réservations effectuées sur le site
          afro-miaam.fr. Toute réservation implique acceptation pleine et
          entière des présentes conditions.
        </Block>

        <Block title="Précommande">
          Les commandes sont à passer au minimum 24 heures avant le créneau
          choisi. Aucune commande ne peut être confirmée pour le jour même.
        </Block>

        <Block title="Paiement">
          Pour cette première version, aucun paiement n&apos;est encaissé en
          ligne. Notre équipe vous rappelle après votre réservation pour
          confirmer la commande et finaliser le paiement par téléphone.
        </Block>

        <Block title="Retrait & livraison">
          Le retrait sur place est gratuit. La livraison à Lyon est facturée
          2 €. L&apos;adresse de retrait ou la fenêtre de livraison vous
          sont communiquées par téléphone après validation.
        </Block>

        <Block title="Annulation">
          Toute commande peut être modifiée ou annulée jusqu&apos;à 24h avant
          le créneau choisi, en nous contactant par téléphone ou via la page
          contact.
        </Block>
      </div>
    </section>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="font-display text-xl font-bold text-primary">{title}</h2>
      <p className="mt-2 text-primary/75">{children}</p>
    </div>
  );
}
