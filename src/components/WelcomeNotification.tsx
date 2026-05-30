"use client";

import { motion, AnimatePresence } from "framer-motion";
import { GiftIcon, ClockIcon, UserIcon, CheckIcon } from "./Icons";
import { useAuth } from "./AuthContext";

export function WelcomeNotification({ onClose }: { onClose: () => void }) {
  const { updateProfile } = useAuth();

  const handleClose = async () => {
    // Marquer la première connexion comme terminée dans la DB
    try {
      await updateProfile({ isFirstLogin: false });
      onClose();
    } catch (err) {
      console.error(err);
      onClose();
    }
  };

  const steps = [
    {
      icon: <GiftIcon className="h-6 w-6" />,
      title: "Programme Fidélité",
      desc: "Chaque commande vous rapproche de votre 11ème repas offert. Suivez votre progression en temps réel."
    },
    {
      icon: <ClockIcon className="h-6 w-6" />,
      title: "Suivi & Historique",
      desc: "Retrouvez vos classiques et suivez l'avancée de vos commandes en cours depuis votre tableau de bord."
    },
    {
      icon: <span role="img" aria-label="Caméra" className="text-xl">📸</span>,
      title: "Scan Livraison",
      desc: "Le jour J, validez votre réception en scannant le QR Code du restaurant directement depuis votre espace."
    }
  ];

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-primary/60 backdrop-blur-md" />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative w-full max-w-lg overflow-hidden rounded-[2.5rem] bg-white shadow-2xl"
      >
        {/* Header avec motif */}
        <div className="relative bg-primary p-10 text-center text-cream">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'url("/img/pattern-african.png")', backgroundSize: '100px' }} />
          <div className="relative z-10">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent text-white shadow-glow">
              <UserIcon className="h-8 w-8" />
            </div>
            <h2 className="heading-display text-3xl">Bienvenue dans la <span className="text-accent">Famille</span> !</h2>
            <p className="mt-2 text-sm text-cream/60">Découvrez les privilèges de votre nouvel espace Afro Miaam.</p>
          </div>
        </div>

        {/* Liste des fonctionnalités */}
        <div className="p-8 sm:p-10 space-y-8">
          {steps.map((step, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + i * 0.1 }}
              className="flex gap-5"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-creamSoft text-primary ring-1 ring-black/5">
                {step.icon}
              </div>
              <div>
                <h3 className="font-display font-black text-primary text-base uppercase tracking-wider">{step.title}</h3>
                <p className="mt-1 text-xs text-primary/60 leading-relaxed font-medium">{step.desc}</p>
              </div>
            </motion.div>
          ))}
          
          <motion.button 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            onClick={handleClose}
            className="btn btn-primary w-full py-5 text-xs font-black uppercase tracking-[0.2em] shadow-glow"
          >
            C&apos;est compris, merci !
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}
