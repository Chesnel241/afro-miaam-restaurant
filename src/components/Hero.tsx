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

      <div className="container-x relative pb-12 pt-8 sm:pb-16 sm:pt-10 md:pb-20 md:pt-12">
        <div className="relative overflow-hidden rounded-2xl shadow-soft">
          <img
            src="/banniere-site.png"
            alt="Afro Miaam, le goût du pays, l'amour dans chaque assiette"
            className="h-auto w-full"
          />
          <div className="absolute right-[2.5%] top-[69%] h-14 w-14 -translate-y-1/2 sm:h-20 sm:w-20 md:h-24 md:w-24 lg:h-28 lg:w-28 xl:h-32 xl:w-32">
            <CircularBadge />
          </div>
        </div>

        <div className="mt-10 md:mt-14 lg:grid lg:grid-cols-[1.05fr_1fr] lg:items-start lg:gap-12 xl:gap-16">
          <div>
            <p className="eyebrow text-accentSoft">
              Afro dans l&apos;âme, gastro dans l&apos;assiette
            </p>

            <h1 className="heading-display mt-3 text-[40px] leading-[1.05] sm:text-5xl md:text-6xl lg:text-7xl xl:text-[80px]">
              Ça mijote,
              <br />
              ça <span className="italic text-accent">régale</span>
              <span className="text-accent"> !</span>
            </h1>
          </div>

          <div className="mt-6 lg:mt-3">
            <p className="text-base text-cream/85 sm:text-lg">
              Cuisine afro gastronomique préparée avec amour à partir de
              produits frais et de qualité.
            </p>

            <ul className="mt-7 grid gap-3 sm:gap-4 sm:grid-cols-3">
              <Pill
                icon={<PotIcon />}
                label="Fait maison"
                sub="Préparé le jour même"
              />
              <Pill
                icon={<LeafIcon />}
                label="Produits frais"
                sub="Sélectionnés avec soin"
              />
              <Pill
                icon={<HeartIcon />}
                label="Fait avec amour"
                sub="Pour votre plaisir"
              />
            </ul>

            <div className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
              <Link
                href="/menu"
                className="btn btn-lg btn-primary justify-center"
              >
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
    <div className="relative h-full w-full">
      <svg
        viewBox="0 0 200 200"
        className="spin-slow absolute inset-0 h-full w-full"
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
      <div className="absolute inset-[18%] flex flex-col items-center justify-center rounded-full bg-accent text-cream shadow-soft">
        <span className="font-display text-[11px] font-extrabold leading-none sm:text-base md:text-lg lg:text-2xl xl:text-3xl">
          24H
        </span>
        <span className="hidden text-[6px] font-bold uppercase tracking-widest sm:block sm:text-[7px] md:text-[8px] lg:text-[9px] xl:text-[10px]">
          à l&apos;avance
        </span>
      </div>
    </div>
  );
}
