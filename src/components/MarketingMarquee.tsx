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
    <div className="relative w-full overflow-hidden bg-primary py-3 sm:py-4 border-y border-accent/20">
      {/* Background Pattern Subtil */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
           style={{ backgroundImage: 'url("/img/pattern-african.png")', backgroundSize: '100px' }} 
      />
      
      <div className="flex whitespace-nowrap animate-marquee">
        {/* Premier groupe de messages */}
        <div className="flex items-center gap-10 px-4">
          {MESSAGES.map((msg, i) => (
            <React.Fragment key={i}>
              <span className="text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] text-cream">
                {msg}
              </span>
              <span className="text-accent text-lg">✦</span>
            </React.Fragment>
          ))}
        </div>
        
        {/* Deuxième groupe identique pour l'effet infini */}
        <div className="flex items-center gap-10 px-4">
          {MESSAGES.map((msg, i) => (
            <React.Fragment key={`clone-${i}`}>
              <span className="text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] text-cream">
                {msg}
              </span>
              <span className="text-accent text-lg">✦</span>
            </React.Fragment>
          ))}
        </div>
      </div>

      <style jsx>{`
        .animate-marquee {
          animation: marquee 40s linear infinite;
        }
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}
