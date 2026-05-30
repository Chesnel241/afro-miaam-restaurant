"use client";

import Image from "next/image";
import Link from "next/link";
import { Hero } from "@/components/Hero";
import { BenefitsGrid } from "@/components/BenefitsGrid";
import { HowItWorks } from "@/components/HowItWorks";
import { ProductCard } from "@/components/ProductCard";
import { useAuth } from "@/components/AuthContext";
import { useMenu } from "@/components/MenuContext";
import { useOrders } from "@/components/OrderContext";
import { HeartIcon, LeafIcon, PotIcon, GiftIcon } from "@/components/Icons";
import { useMemo } from "react";

export default function HomePage() {
  const { user } = useAuth();
  const { dynamicMenu } = useMenu();
  const { userOrders } = useOrders();
  
  const signatures = useMemo(() => {
    return dynamicMenu.filter((i) => i.category === "signature" && i.available).slice(0, 3);
  }, [dynamicMenu]);

  // Suggestions personnalisées pour le client connecté
  const recentItems = useMemo(() => {
    if (!userOrders || userOrders.length === 0) return [];
    const names = Array.from(new Set(userOrders.flatMap(o => o.items.map(i => i.name))));
    return dynamicMenu.filter(i => names.includes(i.name) && i.available).slice(0, 3);
  }, [userOrders, dynamicMenu]);

  return (
    <>
      <Hero />
      
      {!user && (
        <>
          <BenefitsGrid />
          <HowItWorks />
        </>
      )}

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
          <div className="flex justify-center w-full mt-8">
            <Link
              href="/menu"
              className="btn btn-md btn-ghost-dark px-10"
            >
              Voir tout le menu
            </Link>
          </div>
          </div>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:gap-8 xl:mt-14">
            {signatures.map((item) => (
              <ProductCard key={item.id} item={item} />
            ))}
          </div>
        </div>
      </section>

      {/* Valeurs (on les garde car elles renforcent la marque même pour les clients habituels, mais on peut les condenser si besoin) */}
      <section className="relative overflow-hidden bg-cream py-14 sm:py-20 xl:py-28">
        <div className="container-x">
          <div className="grid gap-12 md:grid-cols-[1.2fr_1fr] xl:gap-20 md:items-center">
            <div>
              <p className="eyebrow">Notre promesse</p>
              <h2 className="heading-display mt-3 text-3xl text-primary sm:text-4xl lg:text-5xl">
                L&apos;excellence afro-gastronomique pour vos repas
                <span className="text-accent"> et événements.</span>
              </h2>
              <p className="mt-4 max-w-xl xl:max-w-2xl text-primary/75">
                Afro Miaam, c&apos;est la rencontre entre les saveurs
                authentiques de l&apos;Afrique et le raffinement de la
                gastronomie française.
              </p>

              <ul className="mt-8 grid gap-6 sm:mt-10 sm:grid-cols-2 sm:gap-8 xl:gap-10">
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
                  icon={<GiftIcon className="h-6 w-6" />}
                  title="Service Traiteur & Événements"
                  text="Menus sur mesure, dégustation préalable et flexibilité (halal, végétarien, épices à part) pour sublimer vos événements."
                />
              </ul>
            </div>

            <div className="w-full h-full min-h-[400px] animate-pivot-slow">
              <ImgTile
                src="/promo-afromiaam.jpg"
                alt="Affiche Promotionnelle Afro Miaam"
                tall
              />
            </div>
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="py-12 sm:py-16 xl:py-24">
        <div className="container-x">
          <div className="relative overflow-hidden rounded-2xl bg-primary-gradient bg-grain p-6 text-cream shadow-soft sm:p-10 lg:p-12 xl:p-16">
            <div className="afro-side-pattern absolute inset-0 opacity-50" aria-hidden="true" />
            <div className="relative grid gap-6 md:grid-cols-[1.5fr_auto] xl:grid-cols-[2fr_auto] xl:gap-12 md:items-center">
              <div>
                <p className="eyebrow text-accentSoft">Prêt à commander ?</p>
                <h2 className="heading-display mt-3 text-2xl sm:text-3xl lg:text-4xl xl:text-5xl">
                  De la commande solo au repas d&apos;événement.
                </h2>
                <p className="mt-3 text-sm text-cream/80 sm:text-base xl:text-lg">
                  Réservez vos plats ou demandez un devis traiteur. Nous vous
                  rappelons pour valider les détails.
                </p>
              </div>
              <Link href="/menu" className="btn btn-md btn-primary px-10 xl:btn-lg">
                Commander maintenant
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
