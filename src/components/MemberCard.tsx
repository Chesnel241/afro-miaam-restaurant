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
  const isRewardReady = ordersCount > 0 && currentProgress === 0;

  return (
    <div className="relative overflow-hidden rounded-[2rem] bg-[#132A1F] shadow-2xl border border-white/10 ring-1 ring-accent/20 select-none">
      {/* Subtle organic pattern overlay in background */}
      <div className="afro-side-pattern absolute inset-0 opacity-[0.04] pointer-events-none" />
      
      {/* Left and Right Notches (Apple Wallet Perforation Cutout) */}
      <div className="absolute -left-3.5 top-[65%] h-7 w-7 rounded-full bg-[#fbf8f3] z-20 shadow-inner border-r border-black/5" />
      <div className="absolute -right-3.5 top-[65%] h-7 w-7 rounded-full bg-[#fbf8f3] z-20 shadow-inner border-l border-black/5" />

      {/* Main card body */}
      <div className="relative z-10 p-6 text-cream">
        {/* Pass Header */}
        <div className="flex justify-between items-center mb-6 pb-4 border-b border-white/5">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-full bg-accent/20 flex items-center justify-center border border-accent/35">
              <StarIcon className="h-3.5 w-3.5 text-accent" />
            </div>
            <span className="font-display font-black text-xs tracking-[0.2em] text-accent">AFRO MIAAM</span>
          </div>
          <span className="text-[8px] font-bold text-white/50 tracking-widest uppercase">Pass Fidélité</span>
        </div>

        {/* Card Holder & Status Info Grid */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <p className="text-[8px] font-bold text-white/40 tracking-wider uppercase mb-1">Titulaire</p>
            <h4 className="text-sm font-black text-white uppercase truncate">{userName}</h4>
          </div>
          <div className="text-right">
            <p className="text-[8px] font-bold text-white/40 tracking-wider uppercase mb-1">Statut</p>
            <span className="inline-flex items-center gap-1 rounded-full bg-accent/20 px-2.5 py-0.5 text-[9px] font-black tracking-widest text-accent uppercase border border-accent/25">
              Premium ★
            </span>
          </div>
        </div>

        {/* Loyalty Progress Section */}
        <div className="mb-6">
          <div className="flex justify-between items-end mb-2">
            <p className="text-[8px] font-bold text-white/40 uppercase tracking-widest">
              {isRewardReady ? "Cadeau prêt ! 🎉" : "Prochain cadeau"}
            </p>
            <p className="text-[9px] font-black text-accent">{currentProgress} / {maxOrders}</p>
          </div>
          
          <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden mb-2 relative">
            <motion.div 
              initial={{ scaleX: 0 }}
              animate={{ scaleX: progressPercent / 100 }}
              transition={{ duration: 1, ease: "easeOut" }}
              style={{ originX: 0 }}
              className={`h-full w-full bg-gradient-to-r from-accent to-accentSoft rounded-full ${isRewardReady ? 'animate-pulse' : ''}`}
            />
          </div>

          {!isRewardReady ? (
            <p className="text-[9px] font-medium text-white/50 italic leading-tight">
              Encore {remaining} repas pour votre offre 10+1.
            </p>
          ) : (
            <p className="text-[9px] font-black text-accentSoft animate-bounce leading-tight">
              Présentez ce pass lors de votre retrait !
            </p>
          )}
        </div>

        {/* Perforation dashed line spanning between notches */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center" aria-hidden="true">
            <div className="w-full border-t border-dashed border-white/15" />
          </div>
        </div>

        {/* Wallet Balance & Gift Badges */}
        <div className="flex justify-between items-center mb-6 mt-2">
          <div>
            <p className="text-[8px] font-bold text-white/40 tracking-wider uppercase mb-1">Afro Wallet</p>
            <p className="text-3xl font-black text-white tracking-tight">{referralCredits}€</p>
          </div>
          <div className="flex -space-x-1.5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-7 w-7 rounded-full border-2 border-[#132A1F] bg-accent/15 flex items-center justify-center">
                <GiftIcon className="h-3.5 w-3.5 text-accent" />
              </div>
            ))}
          </div>
        </div>

        {/* Digital Wallet Scan Barcode */}
        <div className="bg-white/95 rounded-xl p-3.5 shadow-inner mt-4 flex flex-col items-center gap-1.5">
          <svg viewBox="0 0 100 25" className="h-9 w-full text-black" fill="currentColor">
            {/* Vector Barcode Blocks */}
            <rect x="2" y="2" width="2" height="21" />
            <rect x="5.5" y="2" width="1" height="21" />
            <rect x="8" y="2" width="3" height="21" />
            <rect x="13" y="2" width="1" height="21" />
            <rect x="16" y="2" width="2" height="21" />
            <rect x="20" y="2" width="4.5" height="21" />
            <rect x="26.5" y="2" width="1" height="21" />
            <rect x="29" y="2" width="2" height="21" />
            <rect x="33" y="2" width="1" height="21" />
            <rect x="36" y="2" width="3" height="21" />
            <rect x="41.5" y="2" width="2" height="21" />
            <rect x="45.5" y="2" width="1" height="21" />
            <rect x="48" y="2" width="4" height="21" />
            <rect x="54" y="2" width="2" height="21" />
            <rect x="58" y="2" width="1" height="21" />
            <rect x="61" y="2" width="3" height="21" />
            <rect x="66" y="2" width="1.5" height="21" />
            <rect x="69.5" y="2" width="2" height="21" />
            <rect x="73" y="2" width="4" height="21" />
            <rect x="79" y="2" width="1" height="21" />
            <rect x="82" y="2" width="2.5" height="21" />
            <rect x="86.5" y="2" width="1" height="21" />
            <rect x="89" y="2" width="3" height="21" />
            <rect x="94" y="2" width="2" height="21" />
          </svg>
          <span className="text-[6.5px] font-mono tracking-[0.45em] text-black/60 uppercase">
            AFRO-MEMBER-{ordersCount}
          </span>
        </div>
      </div>

      {/* Glossy overlay effect typical of premium physical cards */}
      <div className="absolute inset-0 bg-gradient-to-tr from-white/5 via-white/[0.02] to-transparent pointer-events-none" />
    </div>
  );
}
