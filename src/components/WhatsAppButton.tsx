"use client";

import { useEffect, useState, useRef } from "react";
import { useCart } from "./CartContext";
import { LottiePlayer } from "./LottiePlayer";

export function WhatsAppButton() {
  const { itemCount } = useCart();
  const phone = "33751019452";
  const message = encodeURIComponent("Bonjour Afro Miaam ! J'aimerais passer une commande.");
  const url = `https://wa.me/${phone}?text=${message}`;

  const [visible, setVisible] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      // Hide on scroll down after 80px, show on scroll up
      if (currentScrollY > lastScrollY.current && currentScrollY > 80) {
        setVisible(false);
      } else {
        setVisible(true);
      }
      lastScrollY.current = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Nous contacter sur WhatsApp"
      className={`fixed z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition-all duration-300 active:scale-95 bottom-36 right-4 lg:bottom-6 lg:right-24 lg:h-16 lg:w-16 lg:hover:scale-110 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10 pointer-events-none"
      }`}
    >
      <div className="w-10 h-10 sm:w-12 sm:h-12 overflow-hidden flex items-center justify-center">
        <LottiePlayer src="whatsapp.json" autoplay loop speed={1.2} className="w-full h-full scale-[1.3]" />
      </div>
    </a>
  );
}
