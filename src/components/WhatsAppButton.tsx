"use client";

import { useCart } from "./CartContext";

export function WhatsAppButton() {
  const { itemCount } = useCart();
  const phone = "33751019452";
  const message = encodeURIComponent("Bonjour Afro Miaam ! J'aimerais passer une commande.");
  const url = `https://wa.me/${phone}?text=${message}`;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Nous contacter sur WhatsApp"
      className="fixed bottom-6 right-24 z-50 hidden h-16 w-16 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition-all duration-300 hover:scale-110 active:scale-95 lg:flex"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 32 32"
        fill="currentColor"
        className="h-8 w-8 sm:h-9 sm:w-9"
      >
        <path d="M16.004 0h-.008C7.174 0 .002 7.174.002 16c0 3.498 1.13 6.742 3.046 9.374L1.04 31.996l6.868-2.002C10.36 31.266 13.082 32 16.004 32 24.828 32 32 24.826 32 16S24.828 0 16.004 0zm9.314 22.596c-.39 1.098-1.932 2.01-3.176 2.276-.852.18-1.964.322-5.71-1.228-4.798-1.984-7.882-6.842-8.122-7.16-.228-.318-1.924-2.562-1.924-4.886 0-2.324 1.218-3.466 1.65-3.94.39-.428 1.024-.64 1.63-.64.196 0 .374.01.532.018.468.02.702.048 1.012.782.39.92 1.336 3.266 1.454 3.504.12.238.198.516.04.834-.15.318-.228.516-.456.794-.228.278-.478.62-.682.832-.228.238-.466.496-.2.97.266.468 1.182 1.948 2.54 3.154 1.744 1.55 3.214 2.03 3.67 2.256.456.228.722.19.988-.114.27-.31 1.15-1.336 1.456-1.794.302-.456.606-.38 1.024-.228.42.148 2.664 1.256 3.12 1.484.456.228.762.342.874.532.114.188.114 1.098-.276 2.194z" />
      </svg>
    </a>
  );
}
