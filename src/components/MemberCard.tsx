"use client";

import { motion } from "framer-motion";
import { GiftIcon, StarIcon } from "./Icons";

type MemberCardProps = {
  userName: string;
  ordersCount: number;
  referralCredits: number;
};

export function MemberCard({ userName, ordersCount, referralCredits }: MemberCardProps) {
  const maxOrders = 10;
  const currentProgress = ordersCount % maxOrders;
  const progressPercent = (currentProgress / maxOrders) * 100;
  const remaining = maxOrders - currentProgress;

  return (
    <div className="relative overflow-hidden rounded-[2.5rem] bg-primary-gradient p-1 shadow-2xl">
      {/* Pattern de fond */}
      <div className="afro-side-pattern absolute inset-0 opacity-10 pointer-events-none" />
      
      <div className="relative z-10 rounded-[2.3rem] bg-primary/20 backdrop-blur-xl p-8 text-cream">
        <div className="flex justify-between items-start mb-10">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-accentSoft mb-1">Status Premium</p>
            <h3 className="font-display text-2xl font-black">{userName}</h3>
          </div>
          <div className="h-14 w-14 rounded-2xl bg-white/10 flex items-center justify-center border border-white/10">
            <StarIcon className="h-8 w-8 text-accent animate-pulse" />
          </div>
        </div>

        {/* Fidélité - Supprimée pour éviter doublon avec Wallet */}
        <div className="flex justify-between items-center pt-6 border-t border-white/5">
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-cream/30 mb-1">Afro Wallet</p>
            <p className="text-2xl font-black text-white">{referralCredits}€</p>
          </div>
          <div className="flex -space-x-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-8 w-8 rounded-full border-2 border-primary bg-accent/20 flex items-center justify-center">
                <GiftIcon className="h-4 w-4 text-accent" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Glossy Effect */}
      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-tr from-white/5 to-transparent pointer-events-none" />
    </div>
  );
}

function StarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 .587l3.668 7.431 8.2 1.192-5.934 5.787 1.4 8.169L12 18.896l-7.334 3.87 1.4-8.169L.132 9.21l8.2-1.192z" />
    </svg>
  );
}
