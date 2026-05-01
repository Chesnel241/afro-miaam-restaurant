"use client";

import { useEffect, useState } from "react";

const MIN_DISPLAY_MS = 1200;
const FADE_OUT_MS = 500;

export function LoadingScreen() {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const startedAt = performance.now();

    const dismiss = () => {
      const elapsed = performance.now() - startedAt;
      const wait = Math.max(0, MIN_DISPLAY_MS - elapsed);
      window.setTimeout(() => {
        setFading(true);
        window.setTimeout(() => setVisible(false), FADE_OUT_MS);
      }, wait);
    };

    if (document.readyState === "complete") {
      dismiss();
      return;
    }

    window.addEventListener("load", dismiss, { once: true });
    return () => window.removeEventListener("load", dismiss);
  }, []);

  useEffect(() => {
    if (visible) {
      const previous = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = previous;
      };
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Chargement d’Afro Miaam"
      className={`fixed inset-0 z-[9999] flex items-center justify-center bg-primary transition-opacity duration-500 ease-out ${
        fading ? "opacity-0" : "opacity-100"
      }`}
    >
      <div className="flex flex-col items-center gap-8 px-6">
        <svg
          viewBox="0 0 900 420"
          xmlns="http://www.w3.org/2000/svg"
          className="w-[min(80vw,560px)] h-auto animate-logo-pop"
          role="img"
          aria-hidden="true"
        >
          <text
            x="140"
            y="160"
            fontFamily="var(--font-display), Poppins, Arial, sans-serif"
            fontSize="110"
            fontWeight="600"
            fill="#F2EFEA"
            letterSpacing="2"
          >
            Afr
          </text>

          <circle cx="405" cy="125" r="48" fill="#F7931E" />

          <ellipse
            cx="415"
            cy="70"
            rx="12"
            ry="22"
            fill="#8BC34A"
            transform="rotate(25 415 70)"
          />
          <ellipse
            cx="450"
            cy="85"
            rx="12"
            ry="22"
            fill="#8BC34A"
            transform="rotate(70 450 85)"
          />

          <text
            x="120"
            y="300"
            fontFamily="var(--font-display), Poppins, Arial, sans-serif"
            fontSize="120"
            fontWeight="600"
            fill="#F2EFEA"
          >
            M
          </text>

          <g transform="translate(245,185)">
            <rect x="6" y="40" width="10" height="75" fill="#F7931E" rx="3" />
            <rect x="0" y="0" width="6" height="40" fill="#F7931E" />
            <rect x="10" y="0" width="6" height="40" fill="#F7931E" />
            <rect x="20" y="0" width="6" height="40" fill="#F7931E" />
            <circle cx="11" cy="-12" r="7" fill="#F7931E" />
          </g>

          <text
            x="285"
            y="300"
            fontFamily="var(--font-display), Poppins, Arial, sans-serif"
            fontSize="120"
            fontWeight="600"
            fill="#F2EFEA"
            letterSpacing="1"
          >
            aam
          </text>

          <text
            x="180"
            y="365"
            fontFamily="var(--font-body), Arial, sans-serif"
            fontSize="24"
            fill="#A3C24F"
            letterSpacing="4"
          >
            • RESTAURANT AFRO GASTRONOMIQUE •
          </text>
        </svg>

        <div
          className="h-1.5 w-44 overflow-hidden rounded-full bg-cream/15"
          aria-hidden="true"
        >
          <div className="h-full w-1/3 animate-loader-bar rounded-full bg-accent" />
        </div>

        <span className="sr-only">Chargement…</span>
      </div>
    </div>
  );
}
