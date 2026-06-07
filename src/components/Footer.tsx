import Link from "next/link";
import { Logo } from "./Logo";
import {
  MailIcon,
  PhoneIcon,
  PinIcon,
} from "./Icons";
import { LottiePlayer } from "./LottiePlayer";
import { NewsletterSignup } from "./NewsletterSignup";

export function Footer() {
  return (
    <footer className="mt-20 bg-primary text-cream bg-grain">
      <div className="afro-divider" aria-hidden="true" />

      <div className="container-x grid gap-10 py-14 md:grid-cols-12 xl:gap-16 xl:py-20">
        <div className="md:col-span-4">
          <Logo variant="light" size="lg" withTagline />
          <p className="mt-5 max-w-sm xl:max-w-md text-cream/80 text-sm xl:text-base leading-relaxed">
            La rencontre entre les saveurs authentiques de l&apos;Afrique et le
            raffinement de la gastronomie française. Faite maison, pensée pour
            être commandée à l&apos;avance.
          </p>
          <p className="mt-4 font-display text-2xl font-extrabold text-accent">
            Ça mijote, ça régale.
          </p>
        </div>

        <div className="md:col-span-2">
          <h4 className="font-display text-lg font-bold text-cream">Naviguer</h4>
          <ul className="mt-4 space-y-2 text-sm text-cream/80">
            <li><Link href="/" className="hover:text-accent">Accueil</Link></li>
            <li><Link href="/menu" className="hover:text-accent">Menu</Link></li>
            <li><Link href="/comment-ca-marche" className="hover:text-accent">Comment ça marche</Link></li>
            <li><Link href="/a-propos" className="hover:text-accent">À propos</Link></li>
            <li><Link href="/faq" className="hover:text-accent">FAQ</Link></li>
            <li><Link href="/contact" className="hover:text-accent">Contact</Link></li>
          </ul>
        </div>

        <div className="md:col-span-3">
          <h4 className="font-display text-lg font-bold text-cream">Infos pratiques</h4>
          <ul className="mt-4 space-y-3 text-sm text-cream/80">
            <li className="flex items-start gap-2">
              <PinIcon className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
              Lyon, France
            </li>
            <li className="flex items-start gap-2">
              <PhoneIcon className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                +33751019452
            </li>
            <li className="flex items-start gap-2">
              <MailIcon className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
              afromiaam@gmail.com
            </li>
            <li className="text-cream/70">Précommande 24h minimum · Paiement après validation</li>
          </ul>

          <div className="mt-5 flex items-center gap-3">
            <Social label="Instagram" href="https://www.instagram.com/afro_miaam?igsh=amV1YXZjc3lhNTV3"><LottiePlayer src="instagram.json" onHover speed={1.5} className="w-10 h-10" /></Social>
            <Social label="Facebook" href="https://www.facebook.com/share/1Kr7G9GA3d/?mibextid=wwXIfr"><LottiePlayer src="facebook.json" onHover speed={1.5} className="w-full h-full scale-[2.2]" /></Social>
            <Social label="TikTok" href="https://www.tiktok.com/@afro_miaam?_r=1&_t=ZS-96GwYiFGd09"><LottiePlayer src="Tiktok.json" onHover speed={1.5} className="w-8 h-8" /></Social>
          </div>
        </div>

        <div className="md:col-span-3 overflow-hidden">
          <h4 className="font-display text-lg font-bold text-cream">Newsletter</h4>
          <p className="mt-4 text-sm text-cream/80">
            Recevez l&apos;ouverture des prochains créneaux et les nouvelles
            recettes.
          </p>
          <div className="mt-4">
            <NewsletterSignup />
          </div>
        </div>
      </div>

      <div className="border-t border-cream/10">
        <div className="container-x flex flex-col items-start justify-between gap-3 py-6 text-xs text-cream/60 sm:flex-row sm:items-center">
          <p>&copy; {new Date().getFullYear()} Afro Miaam, Tous droits réservés.</p>
          <p>
            Site created by <a href="https://logique-prod-agency.vercel.app" target="_blank" rel="noopener noreferrer" className="text-cream underline-offset-4 hover:text-accent hover:underline">Logique Prod</a>
          </p>
          <ul className="flex flex-wrap gap-4">
            <li><Link href="/mentions-legales" className="hover:text-accent">Mentions légales</Link></li>
            <li><Link href="/cgv" className="hover:text-accent">CGV</Link></li>
            <li><Link href="/confidentialite" className="hover:text-accent">Confidentialité</Link></li>
          </ul>
        </div>
      </div>
    </footer>
  );
}

function Social({ label, href, children }: { label: string; href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-cream/10 text-cream transition hover:bg-cream/20 overflow-hidden"
    >
      {children}
    </a>
  );
}
