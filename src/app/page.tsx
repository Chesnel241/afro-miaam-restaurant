import Image from "next/image";
import Link from "next/link";
import { Hero } from "@/components/Hero";
import { HowItWorks } from "@/components/HowItWorks";
import { ProductCard } from "@/components/ProductCard";
import { menuItems } from "@/data/menu";
import { CheckIcon, HeartIcon, LeafIcon, PotIcon } from "@/components/Icons";

export default function HomePage() {
  const signatures = menuItems.filter((i) => i.category === "signature");

  return (
    <>
      <Hero />

      <HowItWorks />

      {/* Signatures */}
      <section className="bg-creamSoft py-14 sm:py-20">
        <div className="container-x">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-xl">
              <p className="eyebrow">Nos signatures</p>
              <h2 className="heading-display mt-3 text-3xl text-primary sm:text-4xl lg:text-5xl">
                Trois plats qui font dire&nbsp;
                <span className="text-accent">miaam</span>.
              </h2>
              <p className="mt-4 text-primary/75">
                Nos plats les plus aimés. Préparés à la commande, jamais à
                l&apos;avance.
              </p>
            </div>
            <Link
              href="/menu"
              className="text-sm font-bold uppercase tracking-[0.18em] text-primary underline-offset-4 hover:text-accent hover:underline"
            >
              Voir tout le menu →
            </Link>
          </div>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {signatures.map((item) => (
              <ProductCard key={item.id} item={item} />
            ))}
          </div>
        </div>
      </section>

      {/* Valeurs */}
      <section className="relative overflow-hidden bg-cream py-14 sm:py-20">
        <div className="container-x">
          <div className="grid gap-12 md:grid-cols-[1.2fr_1fr] md:items-center">
            <div>
              <p className="eyebrow">Notre promesse</p>
              <h2 className="heading-display mt-3 text-3xl text-primary sm:text-4xl lg:text-5xl">
                Une cuisine généreuse, authentique
                <span className="text-accent"> et raffinée.</span>
              </h2>
              <p className="mt-4 max-w-xl text-primary/75">
                Afro Miaam, c&apos;est la rencontre entre les saveurs
                authentiques de l&apos;Afrique et le raffinement de la
                gastronomie française.
              </p>

              <ul className="mt-8 grid gap-6 sm:mt-10 sm:grid-cols-2 sm:gap-8">
                <Value
                  icon={<LeafIcon className="h-6 w-6" />}
                  title="Ingrédients frais"
                  text="Sélectionnés chaque matin auprès de producteurs locaux et de qualité."
                />
                <Value
                  icon={<PotIcon className="h-6 w-6" />}
                  title="Recettes revisitées"
                  text="Mafé, Yassa, Thieboudienne, réinterprétés sans jamais être trahis."
                />
                <Value
                  icon={<HeartIcon className="h-6 w-6" />}
                  title="Préparé avec amour"
                  text="Chaque plat est cuisiné pour vous, à la commande."
                />
                <Value
                  icon={<CheckIcon className="h-6 w-6" />}
                  title="Zéro compromis"
                  text="Pas de batch cooking, pas de tiédeur. Juste une cuisine vivante."
                />
              </ul>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <ImgTile
                src="https://images.unsplash.com/photo-1547928576-b822bc410bdf?auto=format&fit=crop&w=700&q=80"
                alt="Mafé fumant"
                tall
              />
              <div className="grid gap-4">
                <ImgTile
                  src="https://images.unsplash.com/photo-1542367592-8849eb950fd8?auto=format&fit=crop&w=700&q=80"
                  alt="Cuisine authentique"
                />
                <ImgTile
                  src="https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&w=700&q=80"
                  alt="Détail d'un plat"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="py-12 sm:py-16">
        <div className="container-x">
          <div className="relative overflow-hidden rounded-2xl bg-primary-gradient bg-grain p-6 text-cream shadow-soft sm:p-10 lg:p-12">
            <div className="afro-side-pattern absolute inset-0 opacity-50" aria-hidden="true" />
            <div className="relative grid gap-6 md:grid-cols-[1.5fr_auto] md:items-center">
              <div>
                <p className="eyebrow text-accentSoft">Prêt à commander ?</p>
                <h2 className="heading-display mt-3 text-2xl sm:text-3xl lg:text-4xl">
                  Commande aujourd&apos;hui, savoure demain.
                </h2>
                <p className="mt-3 text-sm text-cream/80 sm:text-base">
                  Paiement après validation par téléphone. Vous réservez, on
                  vous rappelle.
                </p>
              </div>
              <Link href="/menu" className="btn btn-lg btn-primary justify-center">
                Composer ma commande
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function Value({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <li className="flex items-start gap-4">
      <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent/12 text-accent">
        {icon}
      </span>
      <div>
        <p className="font-display text-lg font-bold text-primary">{title}</p>
        <p className="mt-1 text-sm text-primary/75">{text}</p>
      </div>
    </li>
  );
}

function ImgTile({
  src,
  alt,
  tall = false,
}: {
  src: string;
  alt: string;
  tall?: boolean;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-xl shadow-card ${
        tall ? "aspect-[3/4]" : "aspect-[5/4]"
      }`}
    >
      <Image
        src={src}
        alt={alt}
        fill
        sizes="(min-width: 768px) 25vw, 50vw"
        className="object-cover"
      />
    </div>
  );
}
