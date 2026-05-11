"use client";

import Image from "next/image";
import Link from "next/link";
import { Hero } from "@/components/Hero";
import { HowItWorks } from "@/components/HowItWorks";
import { ProductCard } from "@/components/ProductCard";
import { useAuth } from "@/components/AuthContext";
import { CheckIcon, HeartIcon, LeafIcon, PotIcon, GiftIcon } from "@/components/Icons";
import { useMemo } from "react";

export default function HomePage() {
  const { user, dynamicMenu, userOrders } = useAuth();
  
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

      {/* Section Personnalisée pour Utilisateur Connecté */}
      {user && user.role === "customer" && (
        <section className="bg-white py-10 border-b border-cream/20">
          <div className="container-x">
            <div className="rounded-3xl bg-creamSoft p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-8 shadow-sm">
              <div className="flex-1">
                <div className="flex items-center gap-2 text-accent mb-2">
                  <GiftIcon className="h-5 w-5" />
                  <span className="text-xs font-bold uppercase tracking-widest">Espace Privilège</span>
                </div>
                <h2 className="heading-display text-2xl text-primary sm:text-3xl">
                  Bon retour, <span className="text-accent">{user.name}</span>&nbsp;!
                </h2>
                <p className="mt-3 text-primary/70 max-w-lg">
                  Prêt pour votre prochaine expérience gastronomique ? {recentItems.length > 0 ? "Retrouvez vos classiques ou découvrez nos nouveautés." : "Parcourez notre menu et cumulez vos points fidélité."}
                </p>
                <div className="mt-6 flex flex-wrap gap-4">
                  <Link href="/menu" className="btn btn-md btn-primary">
                    Voir la carte
                  </Link>
                  <Link href="/mon-compte" className="btn btn-md btn-ghost-dark">
                    Mon historique
                  </Link>
                </div>
              </div>

              {recentItems.length > 0 && (
                <div className="w-full md:w-auto">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-primary/40 mb-3 text-center md:text-left">
                    Commander à nouveau
                  </p>
                  <div className="flex gap-4">
                    {recentItems.map(item => (
                      <Link key={item.id} href="/menu" className="group block w-20 sm:w-24">
                        <div className="aspect-square rounded-2xl bg-white overflow-hidden shadow-sm group-hover:shadow-soft transition-all">
                          <img src={item.image} alt={item.name} className="h-full w-full object-cover group-hover:scale-110 transition-transform" />
                        </div>
                        <p className="mt-2 text-[10px] font-bold text-primary truncate text-center">{item.name}</p>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* On ne montre le marketing lourd (Comment ça marche) que si pas connecté ou sur demande */}
      {(!user || user.role !== "customer") && <HowItWorks />}

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

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {signatures.map((item) => (
              <ProductCard key={item.id} item={item} />
            ))}
          </div>
        </div>
      </section>

      {/* Valeurs (on les garde car elles renforcent la marque même pour les clients habituels, mais on peut les condenser si besoin) */}
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
              <Link href="/menu" className="btn btn-md btn-primary">
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
