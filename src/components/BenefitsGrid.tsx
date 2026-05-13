"use client";

import { useState } from "react";
import { GiftIcon, ClockIcon, UserIcon } from "./Icons";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "./AuthContext";

const BENEFITS = [
  {
    icon: <GiftIcon className="h-8 w-8" />,
    title: "11ème repas offert",
    desc: "Fidélité récompensée ! 10 plats commandés = le 11ème offert automatiquement.",
    color: "bg-primary"
  },
  {
    icon: <ClockIcon className="h-8 w-8" />,
    title: "Suivi en temps réel",
    desc: "Suivez la préparation et la livraison de votre commande en direct jusqu'à votre porte.",
    color: "bg-accent"
  },
  {
    icon: <span className="text-3xl">📸</span>,
    title: "Scan & Collect",
    desc: "Une validation ultra-rapide et sécurisée via QR Code lors de votre réception.",
    color: "bg-primary"
  }
];

export function BenefitsGrid() {
  const { user } = useAuth();
  const [currentIndex, setCurrentIndex] = useState(0);

  // On ne montre cette invitation qu'aux visiteurs non connectés
  if (user) return null;

  return (
    <section className="relative overflow-hidden bg-cream py-14 sm:py-24">
      {/* Texture Wax en arrière-plan global */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
           style={{ 
             backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0l30 30-30 30L0 30z' fill='%23000' fill-opacity='1' fill-rule='evenodd'/%3E%3C/svg%3E")`, 
             backgroundSize: '40px' 
           }} 
      />

      <div className="container-x relative z-10">
        <div className="max-w-3xl mx-auto text-center mb-12 sm:mb-20 px-4">
          <motion.p 
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="eyebrow mb-4"
          >
            L&apos;expérience privilégiée
          </motion.p>
          <motion.h2 
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="heading-display text-3xl sm:text-4xl lg:text-5xl text-primary"
          >
            Et si vous commandiez avec un <span className="text-accent italic">compte</span> chez nous ?
          </motion.h2>
        </div>

        {/* --- VERSION MOBILE : SWIPE STACK --- */}
        <div className="relative h-[380px] w-full max-w-[320px] mx-auto lg:hidden">
          <AnimatePresence mode="popLayout">
            {BENEFITS.slice(currentIndex).map((benefit, i) => {
              const isFront = i === 0;
              return (
                <motion.div
                  key={benefit.title}
                  style={{ zIndex: BENEFITS.length - i }}
                  initial={{ scale: 0.95, y: 20 + i * 10, opacity: 0 }}
                  animate={{ 
                    scale: 1 - i * 0.05, 
                    y: i * 12, 
                    opacity: 1,
                  }}
                  exit={{ x: 300, opacity: 0, rotate: 20 }}
                  drag={isFront ? "x" : false}
                  dragConstraints={{ left: 0, right: 0 }}
                  onDragEnd={(_, info) => {
                    if (info.offset.x > 100 || info.offset.x < -100) {
                      setCurrentIndex(prev => (prev + 1) % BENEFITS.length);
                      if (currentIndex === BENEFITS.length - 1) {
                         setTimeout(() => setCurrentIndex(0), 200);
                      }
                    }
                  }}
                  className={`absolute inset-0 rounded-[2.5rem] p-8 text-cream shadow-2xl flex flex-col justify-center ${benefit.color} touch-none`}
                >
                  {/* Pattern Wax spécifique à la carte */}
                  <div className="absolute inset-0 opacity-10 mix-blend-overlay pointer-events-none" 
                       style={{ 
                         backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0l30 30-30 30L0 30z' fill='%23fff' fill-opacity='1' fill-rule='evenodd'/%3E%3C/svg%3E")`, 
                         backgroundSize: '30px' 
                       }} 
                  />
                  
                  <div className="relative z-10 text-center">
                    <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 text-white shadow-inner ring-1 ring-white/20 backdrop-blur-sm">
                      {benefit.icon}
                    </div>
                    <h3 className="heading-display mb-4 text-xl uppercase tracking-wider">{benefit.title}</h3>
                    <p className="text-sm font-medium leading-relaxed text-cream/90 px-2">
                      {benefit.desc}
                    </p>
                    {isFront && (
                       <div className="mt-8 flex justify-center gap-1">
                          {BENEFITS.map((_, idx) => (
                            <div key={idx} className={`h-1 rounded-full transition-all ${idx === currentIndex ? 'w-6 bg-white' : 'w-2 bg-white/30'}`} />
                          ))}
                       </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
          <p className="absolute -bottom-12 left-0 right-0 text-center text-[10px] font-black uppercase tracking-widest text-primary/30">
            Balayez pour découvrir <span className="inline-block animate-bounce ml-2">→</span>
          </p>
        </div>

        {/* --- VERSION DESKTOP : GRID --- */}
        <div className="hidden lg:grid gap-8 grid-cols-3">
          {BENEFITS.map((benefit, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className={`group relative overflow-hidden rounded-[2.5rem] p-8 text-cream shadow-soft transition-all hover:scale-[1.02] ${benefit.color}`}
            >
              {/* Pattern Wax spécifique à la carte */}
              <div className="absolute inset-0 opacity-10 mix-blend-overlay group-hover:opacity-20 transition-opacity" 
                   style={{ 
                     backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0l30 30-30 30L0 30z' fill='%23fff' fill-opacity='1' fill-rule='evenodd'/%3E%3C/svg%3E")`, 
                     backgroundSize: '30px' 
                   }} 
              />
              
              <div className="relative z-10">
                <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-white shadow-inner ring-1 ring-white/20 backdrop-blur-sm">
                  {benefit.icon}
                </div>
                <h3 className="heading-display mb-3 text-xl uppercase tracking-wider">{benefit.title}</h3>
                <p className="text-sm font-medium leading-relaxed text-cream/80">
                  {benefit.desc}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
