"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "./CartContext";
import { CartIcon } from "./Icons";
import { formatPrice } from "@/lib/utils";
import { useEffect, useState } from "react";

export function FloatingCart() {
  const pathname = usePathname();
  const { itemCount, total } = useCart();
  const [bounce, setBounce] = useState(false);

  // Trigger bounce animation on item count change
  useEffect(() => {
    if (itemCount > 0) {
      setBounce(true);
      const timer = setTimeout(() => setBounce(false), 500);
      return () => clearTimeout(timer);
    }
  }, [itemCount]);

  // Do not show on the cart page or if cart is empty
  if (pathname === "/panier" || itemCount === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-[76px] left-0 right-0 z-40 px-4 pb-1 pointer-events-none lg:hidden animate-slide-up">
      <div className="max-w-md mx-auto pointer-events-auto">
        <Link
          href="/panier"
          aria-label={`Accéder au panier. Contient ${itemCount} article${itemCount > 1 ? "s" : ""}, total ${formatPrice(total)}`}
          className={`flex w-full items-center justify-between rounded-2xl bg-accent bg-accent-gradient px-5 py-3.5 text-sm font-black uppercase tracking-widest text-white shadow-glow transition-all duration-300 hover:scale-[1.02] active:scale-95 border border-white/10 ${
            bounce ? "animate-bounce" : ""
          }`}
        >
          <span className="inline-flex items-center gap-2.5">
            <span className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-white/20">
              <CartIcon className="h-4.5 w-4.5" />
              <span className="absolute -right-1 -top-1.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-red-600 px-1 text-[8px] font-black">
                {itemCount}
              </span>
            </span>
            <span>Voir le panier</span>
          </span>
          <span className="font-extrabold text-base bg-white/10 px-3 py-1 rounded-xl">
            {formatPrice(total)}
          </span>
        </Link>
      </div>
    </div>
  );
}
