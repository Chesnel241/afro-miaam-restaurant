import React from "react";
import Link from "next/link";
import { ChefHat, Clock, ShieldCheck, Instagram, Facebook } from "lucide-react";

export default function MaintenancePage() {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-black text-white font-sans selection:bg-accent/30 selection:text-accent">
      {/* Texture de grain de fond */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.03] bg-[url('/img/bg-grain.png')] bg-repeat" />
      
      {/* Gradients de décoration */}
      <div className="pointer-events-none absolute -left-24 -top-24 h-96 w-96 rounded-full bg-accent/20 blur-[120px]" />
      <div className="pointer-events-none absolute -right-24 -bottom-24 h-96 w-96 rounded-full bg-primary/20 blur-[120px]" />

      <main className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 py-12 text-center">
        {/* Logo / Icône Animée */}
        <div className="mb-12 relative">
          <div className="absolute inset-0 animate-pulse rounded-full bg-accent/20 blur-3xl" />
          <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-accent to-primary p-0.5 shadow-glow">
            <div className="flex h-full w-full items-center justify-center rounded-full bg-black">
              <ChefHat className="h-10 w-10 text-accent animate-bounce" />
            </div>
          </div>
        </div>

        {/* Contenu Texte */}
        <h1 className="mb-6 text-4xl font-black tracking-tight sm:text-6xl lg:text-7xl">
          <span className="bg-gradient-to-r from-accent via-white to-primary bg-clip-text text-transparent">
            Afro Miaam
          </span>
          <br />
          <span className="text-white/90">se refait une beauté</span>
        </h1>

        <p className="max-w-2xl text-lg text-gray-400 sm:text-xl leading-relaxed">
          Nous optimisons notre plateforme et renforçons notre sécurité pour vous offrir 
          la meilleure expérience gastronomique africaine de Lyon. 
          <br className="hidden sm:block" />
          On revient très vite avec du nouveau ! 🥘✨
        </p>

        {/* Badge Statut */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-4">
          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 backdrop-blur-sm">
            <ShieldCheck className="h-4 w-4 text-green-400" />
            <span className="text-sm font-medium text-gray-300 italic">Système sécurisé en cours de test</span>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 backdrop-blur-sm">
            <Clock className="h-4 w-4 text-accent" />
            <span className="text-sm font-medium text-gray-300">Réouverture imminente</span>
          </div>
        </div>

        {/* Réseaux Sociaux */}
        <div className="mt-16 flex items-center gap-8">
          <Link href="#" className="group flex flex-col items-center gap-2 transition-all hover:scale-110">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/5 border border-white/10 group-hover:border-accent/50 group-hover:bg-accent/10">
              <Instagram className="h-6 w-6 text-gray-400 group-hover:text-accent" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 group-hover:text-accent">Instagram</span>
          </Link>
          <Link href="#" className="group flex flex-col items-center gap-2 transition-all hover:scale-110">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/5 border border-white/10 group-hover:border-primary/50 group-hover:bg-primary/10">
              <Facebook className="h-6 w-6 text-gray-400 group-hover:text-primary" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 group-hover:text-primary">Facebook</span>
          </Link>
        </div>
      </main>

      {/* Footer minimaliste */}
      <footer className="absolute bottom-8 left-0 w-full px-6 text-center text-xs font-medium uppercase tracking-[0.2em] text-gray-600">
        &copy; {new Date().getFullYear()} Afro Miaam Restaurant Lyon &bull; Excellence Culinaire
      </footer>
    </div>
  );
}
