import Image from "next/image";
import Link from "next/link";
import { Hero } from "@/components/Hero";
import { HowItWorks } from "@/components/HowItWorks";
import { ProductCard } from "@/components/ProductCard";
import { NewsletterSignup } from "@/components/NewsletterSignup";
import { menuItems } from "@/data/menu";

export default function HomePage() {
  const signatures = menuItems.filter((i) => i.category === "signature");

  return (
    <>
      <Hero />

      <HowItWorks />

      <section className="bg-afro-cream-soft py-20">
        <div className="container-x">
          <div className="flex items-end justify-between gap-6">
            <div className="max-w-xl">
              <p className="eyebrow">Nos signatures</p>
              <h2 className="heading-display mt-3 text-4xl text-afro-green sm:text-5xl">
                Trois plats qui font dire&nbsp;
                <span className="text-afro-orange">miaam</span>.
              </h2>
              <p className="mt-4 text-afro-black/75">
                Nos plats les plus aimés. Préparés à la demande, jamais à
                l&apos;avance.
              </p>
            </div>
            <Link
              href="/menu"
              className="hidden shrink-0 self-end text-sm font-bold text-afro-green underline-offset-4 hover:underline sm:inline"
            >
              Voir tout le menu →
            </Link>
          </div>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {signatures.map((item) => (
              <ProductCard key={item.id} item={item} />
            ))}
          </div>

          <div className="mt-8 sm:hidden">
            <Link href="/menu" className="btn btn-md btn-ghost-dark">
              Voir tout le menu
            </Link>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-afro-green py-20 text-afro-cream">
        <div className="afro-pattern-bg absolute inset-0 opacity-60" aria-hidden="true" />
        <div className="container-x relative grid gap-12 md:grid-cols-2 md:items-center">
          <div>
            <p className="eyebrow text-afro-orange-soft">Notre promesse</p>
            <h2 className="heading-display mt-3 text-4xl sm:text-5xl">
              Une cuisine généreuse, authentique et raffinée.
            </h2>
            <ul className="mt-8 grid gap-4">
              <Value>Ingrédients frais et sélectionnés</Value>
              <Value>Recettes traditionnelles revisitées</Value>
              <Value>Préparé avec amour chaque jour</Value>
              <Value>Zéro compromis sur la qualité</Value>
            </ul>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <ImgTile src="https://images.unsplash.com/photo-1547928576-b822bc410bdf?auto=format&fit=crop&w=700&q=80" alt="Mafé fumant" tall />
            <div className="grid gap-4">
              <ImgTile src="https://images.unsplash.com/photo-1542367592-8849eb950fd8?auto=format&fit=crop&w=700&q=80" alt="Cuisine authentique" />
              <ImgTile src="https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&w=700&q=80" alt="Détail d'un plat" />
            </div>
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="container-x">
          <div className="rounded-xl bg-afro-green text-afro-cream shadow-soft">
            <div className="grid gap-8 p-8 md:grid-cols-[1fr_auto] md:items-center md:p-12">
              <div>
                <p className="eyebrow text-afro-orange-soft">Restez prévenus</p>
                <h2 className="heading-display mt-3 text-3xl sm:text-4xl">
                  Soyez prévenu de l&apos;ouverture des prochains créneaux.
                </h2>
                <p className="mt-3 text-afro-cream/80">
                  Inscrivez-vous, on vous écrit dès que de nouvelles dates
                  s&apos;ouvrent.
                </p>
              </div>
              <NewsletterSignup />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function Value({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-1 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-afro-orange text-afro-cream">
        ✓
      </span>
      <span className="text-lg text-afro-cream/90">{children}</span>
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
      className={`relative overflow-hidden rounded-lg ${
        tall ? "aspect-[3/4]" : "aspect-[5/4]"
      }`}
    >
      <Image src={src} alt={alt} fill sizes="(min-width: 768px) 25vw, 50vw" className="object-cover" />
    </div>
  );
}
