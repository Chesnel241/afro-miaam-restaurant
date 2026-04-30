import Image from "next/image";
import Link from "next/link";

export const metadata = {
  title: "À propos",
};

export default function AboutPage() {
  return (
    <>
      <section className="bg-primary pt-10 pb-10 text-cream sm:pt-16 sm:pb-12">
        <div className="container-x grid gap-10 md:grid-cols-[1.2fr_1fr] md:items-center">
          <div>
            <p className="eyebrow text-accentSoft">Notre histoire</p>
            <h1 className="heading-display mt-3 text-3xl sm:text-4xl lg:text-6xl">
              Afro dans l&apos;âme,
              <br />
              <span className="text-accent">gastro</span> dans l&apos;assiette.
            </h1>
            <p className="mt-5 max-w-xl text-cream/85">
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

      <section className="py-16">
        <div className="container-x grid gap-10 md:grid-cols-3">
          <Pillar title="Authenticité">
            Des recettes profondément ancrées dans nos racines. Mafé, Yassa,
            Thieboudienne — réinterprétés sans jamais être trahis.
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

      <section className="bg-creamSoft py-16">
        <div className="container-x rounded-xl bg-white p-8 shadow-soft sm:p-12">
          <h2 className="heading-display text-3xl text-primary sm:text-4xl">
            Pourquoi 24h à l&apos;avance&nbsp;?
          </h2>
          <p className="mt-4 max-w-3xl text-primary/75">
            Parce que nous refusons les compromis. Préparer 24h à l&apos;avance,
            c&apos;est nous donner le temps de choisir les meilleurs produits,
            d&apos;allumer les feux à la bonne heure et de cuisiner exactement
            ce que vous avez commandé. Pas de batch cooking. Pas de perte. Pas
            de tiédeur. Juste une cuisine vivante, juste pour vous.
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
    <div className="rounded-lg bg-white p-6 shadow-soft">
      <h3 className="font-display text-xl font-bold text-accent">{title}</h3>
      <p className="mt-3 text-primary/75">{children}</p>
    </div>
  );
}
