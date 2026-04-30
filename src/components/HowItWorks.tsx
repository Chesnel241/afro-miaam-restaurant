import Link from "next/link";
import { ArrowRightIcon, CalendarIcon, CartIcon, PotIcon, TruckIcon } from "./Icons";

const STEPS = [
  {
    number: 1,
    title: "Choisissez",
    sub: "vos plats préférés sur notre menu",
    icon: <PotIcon className="h-7 w-7" />,
  },
  {
    number: 2,
    title: "Commandez",
    sub: "24h à l'avance minimum",
    icon: <CalendarIcon className="h-7 w-7" />,
  },
  {
    number: 3,
    title: "Récupérez",
    sub: "ou faites-vous livrer à Lyon",
    icon: <CartIcon className="h-7 w-7" />,
  },
];

export function HowItWorks({ withCta = true }: { withCta?: boolean }) {
  return (
    <section className="bg-cream py-20" id="comment-ca-marche">
      <div className="container-x">
        <div className="grid gap-10 md:grid-cols-[1.5fr_1fr] md:items-start">
          <div>
            <p className="eyebrow">Le mode d&apos;emploi</p>
            <h2 className="heading-display mt-3 text-4xl text-primary sm:text-5xl">
              Comment ça marche&nbsp;?
            </h2>

            <ol className="mt-10 grid gap-8 sm:grid-cols-3">
              {STEPS.map((step) => (
                <li key={step.number} className="relative flex flex-col items-start">
                  <div className="relative">
                    <span className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-creamSoft text-primary shadow-card">
                      {step.icon}
                    </span>
                    <span className="absolute -right-2 -top-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-cream">
                      {step.number}
                    </span>
                  </div>
                  <p className="mt-4 text-xs font-bold uppercase tracking-widest text-primary">
                    {step.title}
                  </p>
                  <p className="mt-1 text-base text-primary/75">{step.sub}</p>
                </li>
              ))}
            </ol>
          </div>

          {/* Carte Livraison à Lyon */}
          <div className="relative overflow-hidden rounded-2xl bg-primary p-7 text-cream shadow-soft bg-grain">
            <div className="afro-side-pattern absolute inset-0 opacity-50" aria-hidden="true" />
            <div className="relative">
              <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-cream/10 text-cream">
                <TruckIcon className="h-7 w-7" />
              </span>
              <p className="mt-5 font-display text-2xl font-extrabold leading-tight">
                Livraison à Lyon
                <br />
                <span className="text-accent">2 €</span> seulement
              </p>
              <p className="mt-2 text-sm text-cream/75">
                Retrait sur place gratuit. L&apos;adresse exacte vous est
                communiquée après validation par téléphone.
              </p>
              {withCta && (
                <Link
                  href="/comment-ca-marche"
                  className="mt-5 inline-flex items-center gap-2 rounded-full bg-cream px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-primary transition hover:bg-accent hover:text-white"
                >
                  En savoir plus
                  <ArrowRightIcon className="h-4 w-4" />
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
