import Image from "next/image";
import Link from "next/link";

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-afro-green text-afro-cream">
      <div className="afro-pattern-bg absolute inset-0 opacity-70" aria-hidden="true" />
      <div className="absolute -top-40 -right-40 h-[420px] w-[420px] rounded-full bg-afro-orange/20 blur-3xl" aria-hidden="true" />
      <div className="absolute -bottom-32 -left-32 h-[360px] w-[360px] rounded-full bg-afro-green-light/20 blur-3xl" aria-hidden="true" />

      <div className="container-x relative grid items-center gap-12 py-16 md:grid-cols-[1.1fr_1fr] md:py-24 lg:py-28">
        <div>
          <p className="eyebrow text-afro-orange-soft">
            Afro dans l&apos;âme, gastro dans l&apos;assiette
          </p>

          <h1 className="heading-display mt-4 text-5xl sm:text-6xl lg:text-7xl">
            Ça mijote,
            <br />
            <span className="text-afro-orange">ça régale !</span>
          </h1>

          <p className="mt-6 max-w-lg text-lg text-afro-cream/85">
            Cuisine afro gastronomique préparée avec amour, à partir de
            produits frais et de qualité. Commande aujourd&apos;hui, savoure
            demain.
          </p>

          <div className="mt-6 flex flex-wrap gap-2">
            <Badge>⏰ Commande 24h à l&apos;avance</Badge>
            <Badge>🍲 Préparation maison</Badge>
            <Badge>🌿 Produits frais</Badge>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="/menu" className="btn btn-lg btn-primary">
              Commander maintenant
            </Link>
            <Link href="/menu" className="btn btn-lg btn-secondary">
              Découvrir le menu
            </Link>
          </div>

          <p className="mt-6 text-sm text-afro-cream/70">
            Paiement après validation par téléphone — vous réservez, on vous rappelle.
          </p>
        </div>

        <div className="relative">
          <div className="relative aspect-square w-full overflow-hidden rounded-xl shadow-soft md:aspect-[4/5]">
            <Image
              src="https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=1200&q=80"
              alt="Plat signature Afro Miaam"
              fill
              priority
              sizes="(min-width: 768px) 50vw, 100vw"
              className="object-cover"
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-afro-green/80 via-afro-green/0 to-transparent p-6">
              <span className="badge bg-white/95 text-afro-green">
                Plat signature — Poulet Yassa revisité
              </span>
            </div>
          </div>

          <div className="absolute -bottom-6 -left-6 hidden rounded-lg bg-afro-cream p-4 text-afro-green shadow-soft sm:block animate-floaty">
            <p className="font-display text-lg font-bold leading-tight">+18 plats</p>
            <p className="text-xs text-afro-green/80">faits maison chaque jour</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-afro-cream/25 bg-white/5 px-3 py-1.5 text-sm font-medium text-afro-cream/90">
      {children}
    </span>
  );
}
