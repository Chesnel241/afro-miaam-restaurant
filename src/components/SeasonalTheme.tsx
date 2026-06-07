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
    <div className="relative z-50 pointer-events-none w-0 h-0">
      <div className="absolute left-2 -top-6 lg:-top-8 w-16 h-16 sm:w-20 sm:h-20 opacity-90 mix-blend-normal">
      {season === "HIVER" && (
        <LottiePlayer 
          src="HIVER 1.json" 
          autoplay 
          loop 
          className="w-full h-full drop-shadow-md"
        />
      )}
      {season === "ETE" && (
        <LottiePlayer 
          src="ETE  ET PRINTEMPS.json" 
          autoplay 
          loop 
          className="w-full h-full drop-shadow-md"
        />
      )}
      </div>
    </div>
  );
}
