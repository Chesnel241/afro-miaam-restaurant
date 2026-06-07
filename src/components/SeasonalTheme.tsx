"use client";

import { useEffect, useState } from "react";
import { LottiePlayer } from "./LottiePlayer";

export function SeasonalTheme() {
  const [season, setSeason] = useState<"HIVER" | "ETE" | null>(null);

  useEffect(() => {
    const month = new Date().getMonth(); // 0 = Jan, 11 = Dec
    // Hiver : Décembre, Janvier, Février
    if (month === 11 || month === 0 || month === 1) {
      setSeason("HIVER");
    } 
    // Été / Printemps : Mai, Juin, Juillet, Août (simplifié)
    else if (month >= 4 && month <= 7) {
      setSeason("ETE");
    }
  }, []);

  if (!season) return null;

  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden opacity-30 mix-blend-overlay">
      {season === "HIVER" && (
        <LottiePlayer 
          src="HIVER 1.json" 
          autoplay 
          loop 
          renderer="canvas"
          className="absolute -top-20 -left-20 w-[150vw] h-[150vh] max-w-none max-h-none"
        />
      )}
      {season === "ETE" && (
        <LottiePlayer 
          src="ETE  ET PRINTEMPS.json" 
          autoplay 
          loop 
          renderer="canvas"
          className="absolute -top-20 -left-20 w-[150vw] h-[150vh] max-w-none max-h-none"
        />
      )}
    </div>
  );
}
