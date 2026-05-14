"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ClockIcon, ArrowRightIcon } from "./Icons";
import Link from "next/link";
import { useAuth } from "./AuthContext";

export function CartRecovery() {
  const { user } = useAuth();
  const [show, setShow] = useState(false);
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    // On vérifie le localStorage pour un panier abandonné
    const savedCart = localStorage.getItem("afro-miaam-cart");
    if (savedCart) {
      try {
        const items = JSON.parse(savedCart);
        if (items.length > 0) {
          setCartCount(items.length);
          // On affiche après 3 secondes pour ne pas être trop intrusif
          const timer = setTimeout(() => setShow(true), 3000);
          return () => clearTimeout(timer);
        }
      } catch (e) {
        console.error("Cart parsing error", e);
      }
    }
  }, []);

  if (!show) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 50, scale: 0.9 }}
        className="fixed bottom-6 right-6 z-[100] w-[calc(100vw-3rem)] sm:w-96"
      >
        <div className="relative overflow-hidden rounded-[2rem] bg-white p-6 shadow-2xl ring-1 ring-primary/5">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
               style={{ 
                 backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0l30 30-30 30L0 30z' fill='%23000' fill-opacity='1' fill-rule='evenodd'/%3E%3C/svg%3E")`, 
                 backgroundSize: '30px' 
               }} 
          />
          
          <div className="relative z-10 flex items-center gap-5">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-accent/10 text-accent">
              <ClockIcon className="h-8 w-8 animate-pulse" />
            </div>
            <div className="flex-1">
              <h3 className="font-display text-lg font-black text-primary leading-tight">On garde votre Tiep au chaud ?</h3>
              <p className="mt-1 text-xs font-medium text-primary/50 leading-relaxed">
                Vous avez <span className="text-accent font-bold">{cartCount} article(s)</span> qui attendent dans votre panier.
              </p>
            </div>
          </div>

          <div className="mt-6 flex items-center gap-3">
            <Link 
              href="/menu" 
              onClick={() => setShow(false)}
              className="flex-1 btn btn-md bg-primary text-white h-12 rounded-xl flex items-center justify-center gap-2 group"
            >
              Voir mon panier
              <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <button 
              onClick={() => setShow(false)}
              className="h-12 px-4 rounded-xl text-xs font-bold uppercase tracking-widest text-primary/30 hover:text-primary transition-colors"
            >
              Plus tard
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
