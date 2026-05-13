"use client";

import React from "react";

const MESSAGES = [
  "✨ Créer un compte pour bénéficier de plus d'avantages",
  "🎁 Votre 11ème repas est offert avec notre programme de fidélité",
  "🚀 Suivez vos commandes en temps réel",
  "📸 Validation Click & Collect sécurisée via QR Code",
  "💎 Accédez à votre historique et vos plats favoris",
  "Afro Miaam : Une expérience gastronomique unique",
];

export function MarketingMarquee() {
  return (
    <div className="relative w-full overflow-hidden bg-accent py-4 sm:py-5 border-y border-primary/10 shadow-lg">
      <div className="flex whitespace-nowrap animate-marquee">
        {/* Premier groupe de messages */}
        <div className="flex items-center gap-12 px-4">
          {MESSAGES.map((msg, i) => (
            <React.Fragment key={i}>
              <div className="flex items-center gap-4">
                <span className="inline-block h-8 w-8 rounded-full bg-white p-1.5 shadow-sm border-2 border-primary/10 rotate-12">
                   <img src="/favicon.svg" alt="Afro Miaam" className="h-full w-full object-contain" />
                </span>
                <span className="text-xs sm:text-sm font-black uppercase tracking-[0.2em] text-primary">
                  {msg}
                </span>
              </div>
              <span className="h-2 w-2 rounded-full bg-primary/20"></span>
            </React.Fragment>
          ))}
        </div>
        
        {/* Deuxième groupe identique pour l'effet infini */}
        <div className="flex items-center gap-12 px-4">
          {MESSAGES.map((msg, i) => (
            <React.Fragment key={`clone-${i}`}>
              <div className="flex items-center gap-4">
                <span className="inline-block h-8 w-8 rounded-full bg-white p-1.5 shadow-sm border-2 border-primary/10 -rotate-12">
                   <img src="/favicon.svg" alt="Afro Miaam" className="h-full w-full object-contain" />
                </span>
                <span className="text-xs sm:text-sm font-black uppercase tracking-[0.2em] text-primary">
                  {msg}
                </span>
              </div>
              <span className="h-2 w-2 rounded-full bg-primary/20"></span>
            </React.Fragment>
          ))}
        </div>
      </div>

      <style jsx>{`
        .animate-marquee {
          animation: marquee 20s linear infinite;
        }
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}
