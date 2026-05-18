"use client";

import { useEffect, useState } from "react";
import { Logo } from "./Logo";

// Splash écran : apparaît à chaque chargement du site avec le logo Afro Miaam.
// Affichage rapide (~1.4s) puis fondu vers le contenu.
//
// Choix techniques :
// - Pas de cache (sessionStorage) : volonté de marquer chaque visite par l'identité.
// - Inline (pas de framer-motion) pour éviter un chargement JS lourd sur la frame
//   initiale, et garantir un rendu immédiat.
// - Body scroll lock pendant l'animation pour éviter un saut visuel.

const TOTAL_DURATION_MS = 1400; // Total : visible + fondu
const FADE_DURATION_MS = 400;   // Durée du fondu de sortie

export function LoadingScreen() {
  const [phase, setPhase] = useState<"visible" | "fading" | "hidden">("visible");

  useEffect(() => {
    document.body.style.overflow = "hidden";

    const startFade = window.setTimeout(() => {
      setPhase("fading");
    }, TOTAL_DURATION_MS - FADE_DURATION_MS);

    const hide = window.setTimeout(() => {
      setPhase("hidden");
      document.body.style.overflow = "";
    }, TOTAL_DURATION_MS);

    return () => {
      window.clearTimeout(startFade);
      window.clearTimeout(hide);
      document.body.style.overflow = "";
    };
  }, []);

  if (phase === "hidden") return null;

  return (
    <div
      aria-hidden="true"
      role="presentation"
      className={
        "fixed inset-0 z-[9999] flex items-center justify-center transition-opacity ease-out " +
        (phase === "fading" ? "opacity-0 pointer-events-none" : "opacity-100")
      }
      style={{
        background:
          "radial-gradient(circle at 50% 40%, #244A33 0%, #1F3D2B 45%, #1A3526 100%)",
        transitionDuration: `${FADE_DURATION_MS}ms`,
      }}
    >
      {/* Halo orange pulsé derrière le logo */}
      <div
        className="absolute h-72 w-72 rounded-full bg-accent/15 blur-3xl animate-pulse"
        style={{ animationDuration: "1800ms" }}
      />

      <div className="relative flex flex-col items-center splash-rise">
        <Logo variant="light" size="xl" withTagline />
        <div className="mt-6 flex items-center gap-1.5" aria-hidden="true">
          <span
            className="inline-block h-2 w-2 rounded-full bg-cream/80 animate-bounce"
            style={{ animationDelay: "0ms" }}
          />
          <span
            className="inline-block h-2 w-2 rounded-full bg-cream/80 animate-bounce"
            style={{ animationDelay: "120ms" }}
          />
          <span
            className="inline-block h-2 w-2 rounded-full bg-cream/80 animate-bounce"
            style={{ animationDelay: "240ms" }}
          />
        </div>
      </div>

      <style jsx>{`
        @keyframes splashRise {
          0% {
            opacity: 0;
            transform: translateY(8px) scale(0.96);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        :global(.splash-rise) {
          animation: splashRise 600ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }
      `}</style>
    </div>
  );
}
