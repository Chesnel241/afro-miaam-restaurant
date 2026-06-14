import Image from "next/image";
import Link from "next/link";

export default function AboutPage() {
  return (
    <>
      <section className="bg-primary pt-10 pb-10 text-cream sm:pt-16 sm:pb-12 xl:pt-20 xl:pb-16">
        <div className="container-x grid gap-10 md:grid-cols-[1.2fr_1fr] xl:gap-16 md:items-center">
          <div>
            <p className="eyebrow text-accentSoft">Notre histoire</p>
            <h1 className="heading-display mt-3 text-3xl sm:text-4xl lg:text-6xl xl:text-7xl">
              Afro dans l&apos;âme,
              <br />
              <span className="text-accent">gastro</span> dans l&apos;assiette.
            </h1>
            <p className="mt-5 max-w-xl xl:max-w-2xl text-cream/85 xl:text-lg">
              Afro Miaam, c&apos;est la rencontre entre les saveurs
              authentiques de l&apos;Afrique et le raffinement de la
              gastronomie française. Une cuisine généreuse, faite maison,
              pensée pour être commandée à l&apos;avance.
            </p>
          </div>
          <div className="relative aspect-[4/5] overflow-hidden rounded-xl shadow-soft">
            <Image
              src="https://images.unsplash.com/photo-1541544537156-7627a7a4aa1c?auto=format&fit=crop&w=900&q=80"
              alt="Cuisine Afro Miaam"
              fill
              sizes="(min-width: 768px) 40vw, 100vw"
              className="object-cover"
            />
          </div>
        </div>
      </section>

      <section className="py-16 xl:py-24">
        <div className="container-x grid gap-10 md:grid-cols-3 xl:gap-16">
          <Pillar title="Authenticité">
            Des recettes profondément ancrées dans nos racines. Mafé, Yassa,
            Thieboudienne, réinterprétés sans jamais être trahis.
          </Pillar>
          <Pillar title="Précision">
            Une cuisine maîtrisée, comme en gastronomie. Cuissons justes,
            assaisonnements ciselés, présentation soignée.
          </Pillar>
          <Pillar title="Chaleur">
            Chaque plat est préparé pour vous, à la commande. C&apos;est ça
            que veut dire « préparé avec amour ».
          </Pillar>
        </div>
      </section>

      <section className="bg-creamSoft py-16 xl:py-24">
        <div className="container-x rounded-xl bg-white p-8 shadow-soft sm:p-12 xl:p-16">
          <h2 className="heading-display text-3xl text-primary sm:text-4xl xl:text-5xl">
            Pourquoi une marge de 3&nbsp;h&nbsp;?
          </h2>
          <p className="mt-4 max-w-3xl xl:max-w-4xl text-primary/75 xl:text-lg">
            Parce que nous refusons les compromis. Trois heures, c&apos;est
            le temps qu&apos;il nous faut pour choisir les meilleurs produits,
            allumer les feux à la bonne heure et cuisiner exactement ce que
            vous avez commandé. Pas de batch cooking. Pas de perte. Pas de
            tiédeur. Vous pouvez commander dans la journée, on s&apos;occupe
            du reste — juste une cuisine vivante, juste pour vous.
          </p>
          <div className="mt-6">
            <Link href="/menu" className="btn btn-md btn-primary">
              Découvrir le menu
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

function Pillar({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-white p-6 xl:p-10 shadow-soft">
      <h3 className="font-display text-xl font-bold text-accent">{title}</h3>
      <p className="mt-3 text-primary/75">{children}</p>
    </div>
  );
}
