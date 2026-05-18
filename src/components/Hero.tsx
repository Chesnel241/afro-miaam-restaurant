import Link from "next/link";
import { ArrowRightIcon, HeartIcon, LeafIcon, PotIcon } from "./Icons";
import { useAuth } from "./AuthContext";

export function Hero() {
  const { user } = useAuth();
  const isCustomer = user?.role === "customer";

  return (
    <section className={`relative overflow-hidden bg-primary-gradient bg-grain text-cream ${isCustomer ? "pb-0 pt-0" : ""}`}>
      <div
        className="absolute inset-y-0 left-0 hidden w-12 afro-side-pattern md:block lg:w-16"
        aria-hidden="true"
      />
      <div
        className="absolute -top-32 -right-32 h-[360px] w-[360px] rounded-full bg-accent/15 blur-3xl"
        aria-hidden="true"
      />

      <div className={`container-x relative ${isCustomer ? "py-10" : "pb-12 pt-8 sm:pb-16 sm:pt-10 md:pb-20 md:pt-12"}`}>
        {!isCustomer && (
          <div className="relative overflow-hidden rounded-2xl shadow-soft mb-10">
            <img
              src="/banniere-site.png"
              alt="Afro Miaam, le goût du pays, l'amour dans chaque assiette"
              className="h-auto w-full"
            />
            <div className="absolute right-[2.5%] top-[69%] h-14 w-14 -translate-y-1/2 sm:h-20 sm:w-20 md:h-24 md:w-24 lg:h-28 lg:w-28 xl:h-32 xl:w-32">
              <CircularBadge />
            </div>
          </div>
        )}

        <div className={`lg:grid lg:items-start lg:gap-12 xl:gap-16 ${isCustomer ? "lg:grid-cols-1" : "lg:grid-cols-[1.05fr_1fr]"}`}>
          <div>
            <p className="eyebrow text-accentSoft uppercase tracking-[0.3em]">
              {isCustomer ? `Ravi de vous revoir, ${user?.name}` : "Afro dans l'âme, gastro dans l'assiette"}
            </p>

            <h1 className={`${isCustomer ? "text-4xl sm:text-5xl lg:text-6xl" : "text-[40px] leading-[1.05] sm:text-5xl md:text-6xl lg:text-7xl xl:text-[80px]"} heading-display mt-3`}>
              {isCustomer ? (
                <>Votre table vous <span className="text-accent italic">attend</span>.</>
              ) : (
                <>
                  Ça <span className="inline-block animate-simmer">mijote</span>,
                  <br />
                  ça <span className="inline-block animate-simmer italic text-accent" style={{ animationDelay: "1s" }}>régale</span>
                  <span className="inline-block animate-simmer text-accent" style={{ animationDelay: "0.5s" }}> !</span>
                </>
              )}
            </h1>
          </div>

          {!isCustomer ? (
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
                </Link>
                <Link
                  href="/menu"
                  className="self-center text-sm font-bold uppercase tracking-[0.18em] text-cream/85 underline-offset-4 hover:text-accent hover:underline"
                >
                  Découvrir le menu
                </Link>
              </div>
            </div>
          ) : (
            <div className="mt-8 flex gap-4">
              <Link
                href="/menu"
                className="btn btn-lg btn-primary"
              >
                Passer commande
              </Link>
              <Link
                href="/mon-compte?tab=orders"
                className="btn btn-lg bg-white/10 text-white border border-white/20 backdrop-blur-md"
              >
                Suivre mes commandes
              </Link>
            </div>
          )}
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
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-white sm:text-[13px]">
          {label}
        </p>
        <p className="text-[10px] font-medium text-cream/60 sm:text-xs">
          {sub}
        </p>
      </div>
    </li>
  );
}

function CircularBadge() {
  return (
    <div className="relative h-full w-full">
      {/* Texte Circulaire Animé */}
      <svg
        viewBox="0 0 200 200"
        className="absolute inset-0 h-full w-full animate-[spin_10s_linear_infinite]"
      >
        <defs>
          <path
            id="badge-path"
            d="M 100, 100 m -85, 0 a 85,85 0 1,1 170,0 a 85,85 0 1,1 -170,0"
          />
        </defs>
        <text className="text-[14px] font-black uppercase tracking-[0.2em] fill-white">
          <textPath href="#badge-path" startOffset="0">
            ★ COMMANDEZ 24H À L&apos;AVANCE ★ COMMANDEZ 24H À L&apos;AVANCE
          </textPath>
        </text>
      </svg>

      {/* Cœur du Badge */}
      <div className="absolute inset-[15%] flex items-center justify-center rounded-full bg-accent text-white shadow-glow">
        <div className="text-center">
          <p className="text-[10px] font-black leading-none sm:text-xs md:text-sm lg:text-base">24H</p>
          <p className="mt-0.5 text-[5px] font-bold uppercase tracking-tighter sm:text-[7px] md:text-[8px]">AVANCE</p>
        </div>
      </div>
    </div>
  );
}
