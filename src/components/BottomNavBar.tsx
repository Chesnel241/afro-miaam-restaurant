"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "./CartContext";
import { useAuth } from "./AuthContext";
import { CartIcon, UserIcon, PotIcon } from "./Icons";

export function BottomNavBar() {
  const pathname = usePathname();
  const { itemCount } = useCart();
  const { user } = useAuth();

  const userLink = user ? (user.role === "admin" ? "/admin" : "/mon-compte") : "/login";

  // Navigation items mapping
  const items = [
    {
      href: "/",
      label: "Accueil",
      icon: (active: boolean) => (
        <svg
          viewBox="0 0 24 24"
          width="22"
          height="22"
          fill={active ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="transition-transform duration-300 group-hover:scale-110"
        >
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      ),
    },
    {
      href: "/menu",
      label: "La Carte",
      icon: (active: boolean) => (
        <PotIcon
          className={`h-[22px] w-[22px] transition-transform duration-300 group-hover:scale-110 ${
            active ? "fill-accent stroke-accent" : ""
          }`}
        />
      ),
    },
    {
      href: "/panier",
      label: "Panier",
      icon: (active: boolean) => (
        <div className="relative">
          <CartIcon
            className={`h-[22px] w-[22px] transition-transform duration-300 group-hover:scale-110 ${
              active ? "stroke-accent fill-accent/10" : ""
            }`}
          />
          {itemCount > 0 && (
            <span className="absolute -right-2 -top-2.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[9px] font-black text-white animate-scale-in">
              {itemCount}
            </span>
          )}
        </div>
      ),
    },
    {
      href: userLink,
      label: "Espace",
      icon: (active: boolean) => (
        <UserIcon
          className={`h-[22px] w-[22px] transition-transform duration-300 group-hover:scale-110 ${
            active ? "fill-accent/20 stroke-accent" : ""
          }`}
        />
      ),
    },
  ];

  return (
    <nav
      aria-label="Navigation mobile"
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-cream/10 bg-primaryDark/95 pb-safe-bottom backdrop-blur shadow-nav-mobile lg:hidden animate-slide-up"
    >
      <div className="flex h-16 items-center justify-around px-2">
        {items.map((it) => {
          const isActive = pathname === it.href;
          return (
            <Link
              key={it.href}
              href={it.href}
              className={`group flex flex-col items-center justify-center w-16 h-full transition-all active:scale-90 duration-75 ${
                isActive ? "text-accent" : "text-cream/55 hover:text-cream"
              }`}
            >
              {it.icon(isActive)}
              <span className="mt-1 text-[9px] font-black uppercase tracking-wider transition-all">
                {it.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
