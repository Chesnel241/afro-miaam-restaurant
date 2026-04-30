"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Logo } from "./Logo";
import { useCart } from "./CartContext";

const NAV_ITEMS = [
  { href: "/", label: "Accueil" },
  { href: "/menu", label: "Menu" },
  { href: "/comment-ca-marche", label: "Comment ça marche" },
  { href: "/a-propos", label: "À propos" },
  { href: "/faq", label: "FAQ" },
  { href: "/contact", label: "Contact" },
];

export function Header() {
  const { itemCount } = useCart();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-40 transition-colors duration-300 ${
        scrolled ? "bg-afro-green/95 backdrop-blur" : "bg-afro-green"
      }`}
    >
      <div className="container-x flex h-16 items-center justify-between gap-4 sm:h-20">
        <Logo variant="light" />

        <nav
          aria-label="Navigation principale"
          className="hidden items-center gap-8 lg:flex"
        >
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm font-semibold text-afro-cream/85 transition hover:text-afro-orange"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/menu"
            className="btn btn-md btn-primary hidden sm:inline-flex"
          >
            Commander
          </Link>
          <Link
            href="/panier"
            aria-label={`Panier — ${itemCount} article${itemCount > 1 ? "s" : ""}`}
            className="relative inline-flex h-11 w-11 items-center justify-center rounded-full bg-afro-cream/10 text-afro-cream transition hover:bg-afro-cream/20"
          >
            <CartIcon />
            {itemCount > 0 && (
              <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-afro-orange px-1 text-[11px] font-bold text-white">
                {itemCount}
              </span>
            )}
          </Link>
          <button
            type="button"
            aria-label="Menu"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-afro-cream/10 text-afro-cream transition hover:bg-afro-cream/20 lg:hidden"
          >
            <BurgerIcon open={open} />
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-afro-cream/10 bg-afro-green-deep lg:hidden">
          <nav className="container-x flex flex-col py-4">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="rounded-md px-2 py-3 text-base font-semibold text-afro-cream/90 hover:bg-afro-cream/5 hover:text-afro-orange"
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/menu"
              onClick={() => setOpen(false)}
              className="btn btn-md btn-primary mt-3 self-start"
            >
              Commander maintenant
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}

function CartIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="22"
      height="22"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 4h2l2.4 12.2a2 2 0 0 0 2 1.6h7.6a2 2 0 0 0 2-1.5L21 8H6" />
      <circle cx="9" cy="20" r="1.4" />
      <circle cx="18" cy="20" r="1.4" />
    </svg>
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
      strokeWidth="2"
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
          <path d="M4 12h16" />
          <path d="M4 17h16" />
        </>
      )}
    </svg>
  );
}
