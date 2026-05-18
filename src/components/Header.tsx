"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Logo } from "./Logo";
import { useCart } from "./CartContext";
import { CartIcon, UserIcon } from "./Icons";
import { useAuth } from "./AuthContext";

const NAV_ITEMS_VISITOR = [
  { href: "/", label: "Accueil" },
  { href: "/menu", label: "Menu" },
  { href: "/prestations", label: "Prestations & Events" },
  { href: "/comment-ca-marche", label: "Comment ça marche" },
  { href: "/contact", label: "Contact" },
];

const NAV_ITEMS_CUSTOMER = [
  { href: "/", label: "Accueil" },
  { href: "/menu", label: "La Carte" },
  { href: "/prestations", label: "Prestations & Events" },
  { href: "/mon-compte", label: "Mon Espace" },
];

export function Header() {
  const { itemCount } = useCart();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const isCustomer = user?.role === "customer";
  const navItems = isCustomer ? NAV_ITEMS_CUSTOMER : NAV_ITEMS_VISITOR;
  const userLink = user ? (user.role === "admin" ? "/admin" : "/mon-compte") : "/login";

  return (
    <header
      className={`sticky top-0 z-40 transition-all duration-300 w-full overflow-hidden ${
        scrolled ? "bg-primary/95 backdrop-blur" : "bg-primary"
      }`}
    >
      <div className={`container-x flex items-center justify-between gap-4 transition-all duration-300 ${
        scrolled ? "h-12 lg:h-20" : "h-14 lg:h-24"
      }`}>
        <Logo variant="light" size="lg" withTagline />

        <nav
          aria-label="Navigation principale"
          className="hidden items-center gap-7 xl:gap-10 lg:flex"
        >
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm font-semibold text-cream/85 transition hover:text-accent"
            >
              {item.label}
            </Link>
          ))}
          {!isCustomer && (
            <Link
              href={userLink}
              className="text-sm font-semibold text-accent transition hover:text-white"
            >
              {user ? "Mon Compte" : "Connexion"}
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-2">
          {/* Hidden on mobile — BottomNavBar handles these */}
          <Link
            href={userLink}
            aria-label={user ? "Mon Compte" : "Connexion / Inscription"}
            className="hidden lg:inline-flex h-11 w-11 items-center justify-center rounded-full bg-cream/10 text-cream transition hover:bg-cream/20"
          >
            <UserIcon className="h-5 w-5" />
          </Link>

          <Link
            href="/panier"
            aria-label={`Panier, ${itemCount} article${itemCount > 1 ? "s" : ""}`}
            className="hidden lg:inline-flex relative h-11 w-11 items-center justify-center rounded-full bg-cream/10 text-cream transition hover:bg-cream/20"
          >
            <CartIcon className="h-5 w-5" />
            {itemCount > 0 && (
              <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-[11px] font-bold text-white">
                {itemCount}
              </span>
            )}
          </Link>
          <button
            type="button"
            aria-label="Menu"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="hidden lg:hidden"
          >
            <BurgerIcon open={open} />
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-cream/10 bg-primaryDark lg:hidden max-h-[85vh] overflow-y-auto">
          <nav className="container-x flex flex-col py-6 space-y-1">
            <p className="px-2 mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-accent/60">Navigation</p>
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="rounded-xl px-4 py-3 text-lg font-bold text-cream/90 transition-all hover:bg-cream/5 hover:text-accent flex items-center justify-between group"
              >
                {item.label}
                <span className="opacity-0 -translate-x-2 transition-all group-hover:opacity-100 group-hover:translate-x-0">→</span>
              </Link>
            ))}
            
            <div className="h-px bg-cream/10 my-4 mx-2" />
            
            <Link
              href={userLink}
              onClick={() => setOpen(false)}
              className={`rounded-2xl px-6 py-4 text-center text-lg font-black shadow-lg transition-all ${
                user 
                  ? "bg-cream/5 text-cream border border-cream/20 hover:bg-cream/10" 
                  : "bg-accent text-white hover:scale-[1.02] active:scale-95"
              }`}
            >
              {user ? "Accéder à mon espace" : "Se connecter / S'inscrire"}
            </Link>
            
            {!isCustomer && (
              <Link
                href="/menu"
                onClick={() => setOpen(false)}
                className="btn btn-lg btn-primary mt-4 w-full shadow-glow"
              >
                Commander maintenant
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}

function BurgerIcon({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="22"
      height="22"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      aria-hidden="true"
    >
      {open ? (
        <>
          <path d="M6 6l12 12" />
          <path d="M18 6L6 18" />
        </>
      ) : (
        <>
          <path d="M4 7h16" />
          <path d="M4 12h12" />
          <path d="M4 17h16" />
        </>
      )}
    </svg>
  );
}
