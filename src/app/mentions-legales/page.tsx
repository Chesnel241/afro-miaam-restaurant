export const metadata = { title: "Mentions légales" };

export default function LegalPage() {
  return (
    <section className="py-16">
      <div className="container-x max-w-3xl space-y-6 rounded-lg bg-white p-8 shadow-soft sm:p-12">
        <p className="eyebrow">Légal</p>
        <h1 className="heading-display text-3xl text-primary sm:text-4xl lg:text-5xl">
          Mentions légales
        </h1>

        <Block title="Éditeur du site">
          Afro Miaam, Lyon, France.
          <br />
          Email : contactnkumu241@gmail.com
        </Block>

        <Block title="Hébergement">
          Le site est hébergé par un prestataire situé en Union Européenne.
          Les coordonnées exactes seront précisées avant mise en ligne
          publique.
        </Block>

        <Block title="Propriété intellectuelle">
          Les contenus, textes, photos, marques et éléments graphiques
          présents sur ce site sont la propriété d&apos;Afro Miaam ou de ses
          partenaires. Toute reproduction sans autorisation est interdite.
        </Block>

        <Block title="Crédits photos">
          Photos d&apos;illustration provisoires fournies par Unsplash, à
          remplacer par les visuels officiels Afro Miaam.
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
