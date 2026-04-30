import Image from "next/image";
import Link from "next/link";
import { ArrowRightIcon, HeartIcon, LeafIcon, PotIcon } from "./Icons";

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-primary-gradient bg-grain text-cream">
      <div
        className="absolute inset-y-0 left-0 hidden w-12 afro-side-pattern md:block lg:w-16"
        aria-hidden="true"
      />
      <div
        className="absolute -top-32 -right-32 h-[360px] w-[360px] rounded-full bg-accent/15 blur-3xl"
        aria-hidden="true"
      />

      <div className="container-x relative grid items-center gap-10 py-12 sm:py-16 md:grid-cols-[1.05fr_1fr] md:py-20 lg:py-24">
        <div>
          <p className="eyebrow text-accentSoft">
            Afro dans l&apos;âme, gastro dans l&apos;assiette
          </p>

          <h1 className="heading-display mt-3 text-[40px] leading-[1.05] sm:text-5xl md:text-6xl lg:text-[72px]">
            Ça mijote,
            <br />
            ça{" "}
            <span className="italic text-accent">régale</span>
            <span className="text-accent"> !</span>
          </h1>

          <p className="mt-4 max-w-md text-base text-cream/85 sm:mt-5 sm:text-lg">
            Cuisine afro gastronomique préparée avec amour à partir de
            produits frais et de qualité.
          </p>

          <ul className="mt-7 grid gap-3 sm:gap-4 md:grid-cols-3">
            <Pill icon={<PotIcon />} label="Fait maison" sub="Préparé le jour même" />
            <Pill icon={<LeafIcon />} label="Produits frais" sub="Sélectionnés avec soin" />
            <Pill icon={<HeartIcon />} label="Fait avec amour" sub="Pour votre plaisir" />
          </ul>

          <div className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
            <Link href="/menu" className="btn btn-lg btn-primary justify-center">
              Commander maintenant
              <ArrowRightIcon className="h-5 w-5" />
            </Link>
            <Link
              href="/menu"
              className="self-center text-sm font-bold uppercase tracking-[0.18em] text-cream/85 underline-offset-4 hover:text-accent hover:underline"
            >
              Découvrir le menu
            </Link>
          </div>
        </div>

        <div className="relative mt-2 md:mt-0">
          <div className="relative aspect-square w-full overflow-hidden rounded-2xl shadow-soft">
            <Image
              src="https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=1400&q=80"
              alt="Plat signature Afro Miaam"
              fill
              priority
              sizes="(min-width: 768px) 50vw, 100vw"
              className="object-cover"
            />
          </div>

          {/* Badge circulaire "Commandez 24h à l'avance" */}
          <div className="absolute -left-3 -top-3 sm:-left-6 sm:top-6 lg:-left-10 lg:top-10">
            <CircularBadge />
          </div>
        </div>
      </div>
    </section>
  );
}

function Pill({
  icon,
  label,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  sub: string;
}) {
  return (
    <li className="flex items-center gap-3">
      <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-cream text-primary md:h-12 md:w-12">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-xs font-bold uppercase tracking-wide text-cream">
          {label}
        </span>
        <span className="block text-sm text-cream/75">{sub}</span>
      </span>
    </li>
  );
}

function CircularBadge() {
  return (
    <div className="relative h-24 w-24 sm:h-32 sm:w-32 lg:h-40 lg:w-40">
      <svg
        viewBox="0 0 200 200"
        className="spin-slow absolute inset-0"
        aria-hidden="true"
      >
        <defs>
          <path
            id="circle-text"
            d="M100,100 m-78,0 a78,78 0 1,1 156,0 a78,78 0 1,1 -156,0"
          />
        </defs>
        <circle
          cx="100"
          cy="100"
          r="92"
          fill="none"
          stroke="#E85D2A"
          strokeWidth="2"
          strokeDasharray="3 6"
        />
        <text
          fill="#F4EDE4"
          fontSize="13"
          fontWeight="700"
          letterSpacing="6"
          fontFamily="var(--font-display), Poppins, sans-serif"
        >
          <textPath href="#circle-text" startOffset="0">
            ★ COMMANDEZ 24H À L&apos;AVANCE ★ COMMANDEZ 24H À L&apos;AVANCE
          </textPath>
        </text>
      </svg>
      <div className="absolute inset-3 flex flex-col items-center justify-center rounded-full bg-accent text-cream shadow-soft sm:inset-4">
        <span className="font-display text-2xl font-extrabold leading-none sm:text-3xl lg:text-4xl">
          24H
        </span>
        <span className="text-[9px] font-bold uppercase tracking-widest sm:text-[10px] lg:text-xs">
          à l&apos;avance
        </span>
      </div>
    </div>
  );
}
