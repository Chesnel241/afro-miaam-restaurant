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

        <svg
          viewBox="0 0 200 180"
          xmlns="http://www.w3.org/2000/svg"
          className="h-36 w-44"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="potGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#F4814F" />
              <stop offset="1" stopColor="#C44820" />
            </linearGradient>
          </defs>

          {/* Vapeur */}
          <g
            fill="none"
            stroke="#F4EDE4"
            strokeWidth="3"
            strokeLinecap="round"
          >
            <path
              d="M75 60 Q72 50 75 38 Q78 28 75 20"
              className="cook-steam cook-steam-1"
            />
            <path
              d="M100 58 Q97 48 100 36 Q103 26 100 18"
              className="cook-steam cook-steam-2"
            />
            <path
              d="M125 60 Q122 50 125 38 Q128 28 125 20"
              className="cook-steam cook-steam-3"
            />
          </g>

          {/* Tomate */}
          <g className="cook-fall cook-fall-1">
            <circle cx="68" cy="14" r="6" fill="#E85D2A" />
            <path
              d="M66 7 Q68 3 71 7"
              stroke="#6BAA75"
              strokeWidth="1.6"
              fill="none"
              strokeLinecap="round"
            />
          </g>

          {/* Feuille d'herbe */}
          <g className="cook-fall cook-fall-2">
            <ellipse
              cx="100"
              cy="14"
              rx="4"
              ry="7"
              fill="#8BC34A"
              transform="rotate(25 100 14)"
            />
            <line
              x1="100"
              y1="20"
              x2="100"
              y2="24"
              stroke="#3F6B45"
              strokeWidth="1"
            />
          </g>

          {/* Piment */}
          <g className="cook-fall cook-fall-3">
            <ellipse cx="132" cy="14" rx="3" ry="7" fill="#F7931E" />
            <path
              d="M130 6 L132 3 L134 6"
              stroke="#6BAA75"
              strokeWidth="1.5"
              fill="none"
              strokeLinecap="round"
            />
          </g>

          {/* Marmite */}
          <g>
            <ellipse cx="44" cy="73" rx="7" ry="4" fill="#C44820" />
            <ellipse cx="156" cy="73" rx="7" ry="4" fill="#C44820" />
            <path
              d="M52 70 L148 70 L146 135 Q146 145 136 145 L64 145 Q54 145 54 135 Z"
              fill="url(#potGrad)"
            />
            <rect
              x="60"
              y="82"
              width="3"
              height="36"
              rx="1.5"
              fill="#F4EDE4"
              opacity="0.3"
            />
            <ellipse cx="100" cy="68" rx="52" ry="7" fill="#1F3D2B" />
            <ellipse cx="100" cy="68" rx="46" ry="5" fill="#3A6E48" />
          </g>

          {/* Bulles à la surface */}
          <circle
            cx="86"
            cy="68"
            r="2.5"
            fill="#A3C24F"
            className="cook-bubble cook-bubble-1"
          />
          <circle
            cx="100"
            cy="68"
            r="3"
            fill="#A3C24F"
            className="cook-bubble cook-bubble-2"
          />
          <circle
            cx="114"
            cy="68"
            r="2"
            fill="#A3C24F"
            className="cook-bubble cook-bubble-3"
          />
        </svg>

        <span className="sr-only">Chargement, ça mijote…</span>
      </div>
    </div>
  );
}
