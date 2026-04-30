import Link from "next/link";

const STEPS = [
  {
    number: "01",
    title: "Choisissez vos plats préférés",
    text: "Parcourez notre carte signature et composez votre commande comme à la maison.",
  },
  {
    number: "02",
    title: "Réservez 24h à l'avance",
    text: "Sélectionnez la date et le créneau de retrait ou de livraison qui vous arrangent.",
  },
  {
    number: "03",
    title: "On vous contacte pour finaliser",
    text: "Vous recevez un appel pour confirmer le paiement et l'adresse, puis on cuisine pour vous.",
  },
];

export function HowItWorks({ withCta = true }: { withCta?: boolean }) {
  return (
    <section className="py-20" id="comment-ca-marche">
      <div className="container-x">
        <div className="max-w-2xl">
          <p className="eyebrow">Le mode d&apos;emploi</p>
          <h2 className="heading-display mt-3 text-4xl text-afro-green sm:text-5xl">
            Comment ça marche&nbsp;?
          </h2>
          <p className="mt-4 text-afro-black/75">
            Afro Miaam, c&apos;est de la cuisine préparée à la demande. Pour
            qu&apos;elle soit parfaite, il nous faut un peu de temps. Voilà
            comment on s&apos;organise ensemble.
          </p>
        </div>

        <ol className="mt-10 grid gap-6 md:grid-cols-3">
          {STEPS.map((step) => (
            <li
              key={step.number}
              className="card-soft flex flex-col gap-3 p-6"
            >
              <span className="font-display text-3xl font-bold text-afro-orange">
                {step.number}
              </span>
              <h3 className="font-display text-xl font-bold text-afro-green">
                {step.title}
              </h3>
              <p className="text-afro-black/75">{step.text}</p>
            </li>
          ))}
        </ol>

        <div className="mt-10 flex flex-col items-start gap-4 rounded-lg border border-afro-orange/20 bg-afro-cream-soft p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-display text-xl font-bold text-afro-green">
              Livraison à Lyon — 2 € seulement
            </p>
            <p className="text-sm text-afro-black/70">
              Retrait sur place gratuit. L&apos;adresse exacte vous est
              communiquée après validation par téléphone.
            </p>
          </div>
          {withCta && (
            <Link href="/menu" className="btn btn-md btn-primary">
              Voir le menu
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
