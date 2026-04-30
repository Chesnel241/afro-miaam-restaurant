export const metadata = { title: "Politique de confidentialité" };

export default function PrivacyPage() {
  return (
    <section className="py-16">
      <div className="container-x max-w-3xl space-y-6 rounded-lg bg-white p-8 shadow-soft sm:p-12">
        <p className="eyebrow">Légal</p>
        <h1 className="heading-display text-3xl text-primary sm:text-4xl lg:text-5xl">
          Politique de confidentialité
        </h1>

        <Block title="Données collectées">
          Lors d&apos;une réservation, nous collectons : nom, prénom, numéro
          de téléphone, email (optionnel) et adresse de livraison si
          applicable. Ces données sont strictement nécessaires au traitement
          de votre commande.
        </Block>

        <Block title="Utilisation">
          Vos données sont utilisées uniquement pour vous recontacter,
          finaliser le paiement par téléphone et organiser la préparation et
          la livraison de votre commande.
        </Block>

        <Block title="Conservation">
          Vos données sont conservées le temps nécessaire au traitement de
          votre commande, puis archivées conformément aux obligations
          légales.
        </Block>

        <Block title="Vos droits">
          Vous disposez d&apos;un droit d&apos;accès, de rectification et de
          suppression de vos données. Pour l&apos;exercer, contactez-nous à
          bonjour@afro-miaam.fr.
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
