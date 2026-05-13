"use client";

import React from "react";

const MESSAGES = [
  "Créer un compte pour bénéficier de plus d'avantages",
  "Votre 11ème repas est offert avec notre programme de fidélité",
  "Suivez vos commandes en temps réel",
  "Validation Click & Collect sécurisée via QR Code",
  "Accédez à votre historique et vos plats favoris",
  "Afro Miaam : Une expérience gastronomique unique",
];

export function MarketingMarquee() {
  return (
    <div className="relative w-full overflow-hidden bg-accent py-4 sm:py-5 border-y border-primary/10 shadow-lg group">
      {/* Texture Tissu Africain (Wax/Bogolan) en filigrane */}
      <div className="absolute inset-0 opacity-[0.15] pointer-events-none mix-blend-overlay" 
           style={{ 
             backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0l30 30-30 30L0 30z' fill='%23000' fill-opacity='1' fill-rule='evenodd'/%3E%3C/svg%3E")`, 
             backgroundSize: '30px' 
           }} 
      />
      
      <div className="flex animate-marquee-fast w-fit">
        {/* Premier groupe de messages */}
        <div className="flex items-center">
          {MESSAGES.map((msg, i) => (
            <div key={i} className="flex items-center gap-6 pr-16">
              <span className="inline-block h-9 w-9 rounded-full bg-white p-2 shadow-md border-2 border-primary/5 rotate-6">
                 <img src="/favicon.svg" alt="Afro Miaam" className="h-full w-full object-contain" />
              </span>
              <span className="text-sm sm:text-base font-black uppercase tracking-[0.25em] text-white drop-shadow-sm">
                {msg}
              </span>
            </div>
          ))}
        </div>
        
        {/* Deuxième groupe rigoureusement identique */}
        <div className="flex items-center">
          {MESSAGES.map((msg, i) => (
            <div key={`clone-${i}`} className="flex items-center gap-6 pr-16">
              <span className="inline-block h-9 w-9 rounded-full bg-white p-2 shadow-md border-2 border-primary/5 -rotate-6">
                 <img src="/favicon.svg" alt="Afro Miaam" className="h-full w-full object-contain" />
              </span>
              <span className="text-sm sm:text-base font-black uppercase tracking-[0.25em] text-white drop-shadow-sm">
                {msg}
              </span>
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        .animate-marquee-fast {
          animation: marquee 30s linear infinite;
        }
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}
