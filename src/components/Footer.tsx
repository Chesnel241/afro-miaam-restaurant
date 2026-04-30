import Link from "next/link";
import { Logo } from "./Logo";

export function Footer() {
  return (
    <footer className="mt-20 bg-afro-green text-afro-cream">
      <div className="afro-divider" aria-hidden="true" />

      <div className="container-x grid gap-10 py-14 md:grid-cols-4">
        <div className="md:col-span-2 max-w-md">
          <Logo variant="light" size="lg" />
          <p className="mt-4 text-afro-cream/80">
            Cuisine afro gastronomique préparée avec amour, à partir de
            produits frais et de qualité. Commande aujourd&apos;hui, savoure demain.
          </p>
          <p className="mt-4 font-display text-2xl text-afro-orange">
            Ça mijote, ça régale.
          </p>
        </div>

        <div>
          <h4 className="font-display text-lg font-bold text-afro-cream">
            Naviguer
          </h4>
          <ul className="mt-4 space-y-2 text-sm text-afro-cream/80">
            <li><Link href="/" className="hover:text-afro-orange">Accueil</Link></li>
            <li><Link href="/menu" className="hover:text-afro-orange">Menu</Link></li>
            <li><Link href="/comment-ca-marche" className="hover:text-afro-orange">Comment ça marche</Link></li>
            <li><Link href="/a-propos" className="hover:text-afro-orange">À propos</Link></li>
            <li><Link href="/faq" className="hover:text-afro-orange">FAQ</Link></li>
            <li><Link href="/contact" className="hover:text-afro-orange">Contact</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="font-display text-lg font-bold text-afro-cream">
            Infos pratiques
          </h4>
          <ul className="mt-4 space-y-2 text-sm text-afro-cream/80">
            <li>Précommande 24h minimum</li>
            <li>Livraison à Lyon — 2 €</li>
            <li>Retrait sur place gratuit</li>
            <li>Paiement après validation par téléphone</li>
          </ul>
          <h4 className="mt-6 font-display text-lg font-bold text-afro-cream">
            Légal
          </h4>
          <ul className="mt-3 space-y-2 text-sm text-afro-cream/80">
            <li><Link href="/mentions-legales" className="hover:text-afro-orange">Mentions légales</Link></li>
            <li><Link href="/cgv" className="hover:text-afro-orange">CGV</Link></li>
            <li><Link href="/confidentialite" className="hover:text-afro-orange">Confidentialité</Link></li>
          </ul>
        </div>
      </div>

      <div className="border-t border-afro-cream/10">
        <div className="container-x flex flex-col items-start justify-between gap-2 py-6 text-xs text-afro-cream/60 sm:flex-row sm:items-center">
          <p>&copy; {new Date().getFullYear()} Afro Miaam — Tous droits réservés.</p>
          <p>Lyon, France</p>
        </div>
      </div>
    </footer>
  );
}
