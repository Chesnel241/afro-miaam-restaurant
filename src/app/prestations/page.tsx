"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TruckIcon, GiftIcon, ClockIcon, ArrowRightIcon, CheckIcon } from "@/components/Icons";
import { formatPrice } from "@/lib/utils";

const PRESTATIONS = [
  {
    id: "corporate",
    title: "Business & Corporate",
    description: "Plateaux repas premium, cocktails dînatoires et séminaires. Donnez une touche d'excellence africaine à vos réunions.",
    icon: <TruckIcon className="h-8 w-8" />,
    basePrice: 25, // par personne
    image: "https://images.unsplash.com/photo-1555244162-803834f70033?q=80&w=2070&auto=format&fit=crop"
  },
  {
    id: "private",
    title: "Célébrations Privées",
    description: "Mariages, baptêmes, anniversaires. Une gestion complète pour des moments inoubliables et savoureux.",
    icon: <GiftIcon className="h-8 w-8" />,
    basePrice: 45,
    image: "https://images.unsplash.com/photo-1519225421980-715cb0215aed?q=80&w=2070&auto=format&fit=crop"
  }
];

const SHOWCASE_IMAGES = [
  "/img/prestations/prestation1.png",
  "/img/prestations/prestation2.png",
  "/img/prestations/prestation3.png",
  "/img/prestations/prestation4.png"
];

export default function PrestationsPage() {
  const [selectedType, setSelectedType] = useState(PRESTATIONS[0].id);
  const [guests, setGuests] = useState(20);
  const [showQuote, setShowQuote] = useState(false);

  const currentPrestation = useMemo(() => 
    PRESTATIONS.find(p => p.id === selectedType) || PRESTATIONS[0]
  , [selectedType]);

  const estimatedTotal = useMemo(() => 
    currentPrestation.basePrice * guests
  , [currentPrestation, guests]);

  return (
    <div className="min-h-screen bg-creamSoft">
      {/* --- HERO SECTION --- */}
      <section className="relative h-[70vh] min-h-[500px] overflow-hidden bg-primary">
        <div className="absolute inset-0">
          <img 
            src={currentPrestation.image} 
            alt={currentPrestation.title}
            className="h-full w-full object-cover opacity-40 transition-opacity duration-1000"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-primary/60 via-transparent to-primary" />
        </div>
        
        <div className="container-x relative z-30 flex h-full flex-col justify-center pt-10 sm:pt-20">
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="eyebrow text-accentSoft"
          >
            Services Traiteur & Événementiel
          </motion.p>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="heading-display mt-4 max-w-3xl text-4xl text-white sm:text-6xl lg:text-7xl"
          >
            Sublimez vos événements avec l&apos;excellence <span className="text-accent">Afro-Gastronomique</span>.
          </motion.h1>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-8 flex gap-4"
          >
            <button 
              onClick={() => document.getElementById('quote-builder')?.scrollIntoView({ behavior: 'smooth' })}
              className="btn btn-lg btn-primary"
            >
              Estimer mon projet
            </button>
            <a href="https://wa.me/33751019452" className="btn btn-lg bg-white/10 text-white backdrop-blur-md border border-white/20 hover:bg-white/20">
              Contacter un expert
            </a>
          </motion.div>
        </div>
      </section>

      {/* --- SERVICES PILLARS --- */}
      <section className="container-x relative z-20 py-16 md:py-24 xl:py-28">
        <div className="grid gap-6 md:grid-cols-2 max-w-5xl mx-auto xl:gap-8">
          {PRESTATIONS.map((item) => (
            <motion.button
              key={item.id}
              onClick={() => setSelectedType(item.id)}
              whileHover={{ y: -5 }}
              className={`group relative overflow-hidden rounded-[2.5rem] p-8 xl:p-10 text-left transition-all ${
                selectedType === item.id 
                  ? "bg-primary text-white shadow-2xl ring-4 ring-accent" 
                  : "bg-white text-primary shadow-soft hover:shadow-xl"
              }`}
            >
              <div className={`mb-6 flex h-14 w-14 items-center justify-center rounded-2xl transition-colors ${
                selectedType === item.id ? "bg-accent text-white" : "bg-accent/10 text-accent"
              }`}>
                {item.icon}
              </div>
              <h3 className="font-display text-xl font-black mb-3">{item.title}</h3>
              <p className={`text-sm leading-relaxed ${selectedType === item.id ? "text-cream/70" : "text-primary/60"}`}>
                {item.description}
              </p>
              <div className="mt-6 flex items-center gap-2 font-black text-[10px] uppercase tracking-widest opacity-60">
                <span>À partir de {item.basePrice}€ / pers</span>
              </div>
            </motion.button>
          ))}
        </div>
      </section>

      {/* --- QUOTE BUILDER --- */}
      <section id="quote-builder" className="container-x py-20 xl:py-28">
        <div className="rounded-[3rem] bg-white shadow-soft ring-1 ring-cream/20 overflow-hidden">
          <div className="grid lg:grid-cols-2">
            {/* Left: Inputs */}
            <div className="p-8 sm:p-16 xl:p-20 border-r border-cream/30">
              <h2 className="heading-display text-3xl xl:text-4xl text-primary mb-2">Simulateur de Devis</h2>
              <p className="text-primary/60 mb-10 italic">Obtenez une première estimation en quelques clics.</p>
              
              <div className="space-y-12">
                {/* Guest Slider */}
                <div className="space-y-6">
                  <div className="flex justify-between items-end">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/40">Nombre de convives</label>
                    <span className="text-4xl font-black text-primary">{guests} <span className="text-lg text-primary/30">pers.</span></span>
                  </div>
                  <input 
                    type="range" 
                    min="10" 
                    max="500" 
                    step="5"
                    value={guests}
                    onChange={(e) => setGuests(parseInt(e.target.value))}
                    className="w-full h-2 bg-creamSoft rounded-full appearance-none cursor-pointer accent-accent"
                  />
                  <div className="flex justify-between text-[10px] font-bold text-primary/20">
                    <span>10 PERS.</span>
                    <span>250 PERS.</span>
                    <span>500 PERS.</span>
                  </div>
                </div>

                {/* Formule Preview */}
                <div className="rounded-3xl bg-creamSoft p-6 border border-cream/50">
                  <p className="text-[10px] font-black uppercase tracking-widest text-primary/40 mb-4">Formule sélectionnée</p>
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-xl bg-primary text-white flex items-center justify-center">
                      {currentPrestation.icon}
                    </div>
                    <div>
                      <p className="font-bold text-primary">{currentPrestation.title}</p>
                      <p className="text-xs text-primary/50">Base de {currentPrestation.basePrice}€ par personne</p>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={() => setShowQuote(true)}
                  className="btn btn-lg btn-primary w-full py-5 text-lg"
                >
                  Calculer l&apos;estimation
                </button>
              </div>
            </div>

            {/* Right: Results */}
            <div className="bg-primary-gradient bg-grain p-8 sm:p-16 xl:p-20 text-cream relative">
              <div className="afro-side-pattern absolute inset-0 opacity-10 pointer-events-none" />
              
              <AnimatePresence mode="wait">
                {showQuote ? (
                  <motion.div 
                    key="result"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="relative z-10 h-full flex flex-col justify-center"
                  >
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-accentSoft mb-2">Estimation Indicative</p>
                    <h3 className="text-6xl sm:text-7xl font-black text-white mb-6">
                      {formatPrice(estimatedTotal)}
                    </h3>
                    
                    <div className="space-y-4 mb-10">
                      <div className="flex items-center gap-3 text-sm font-medium text-cream/70">
                        <CheckIcon className="h-5 w-5 text-accent" /> Cuisine Afro-Gastronomique de saison
                      </div>
                      <div className="flex items-center gap-3 text-sm font-medium text-cream/70">
                        <CheckIcon className="h-5 w-5 text-accent" /> Logistique & Matériel inclus
                      </div>
                      <div className="flex items-center gap-3 text-sm font-medium text-cream/70">
                        <CheckIcon className="h-5 w-5 text-accent" /> Service professionnel (en option)
                      </div>
                    </div>

                    <div className="p-6 rounded-2xl bg-white/10 border border-white/20 backdrop-blur-md mb-10">
                      <p className="text-xs leading-relaxed text-cream/80">
                        <strong className="text-accentSoft">Important :</strong> Ce montant est une estimation basée sur nos tarifs standards. Le devis final peut varier selon vos options spécifiques, le lieu et les contraintes logistiques. Un échange avec notre équipe est nécessaire pour valider le projet.
                      </p>
                    </div>

                    <a 
                      href={`https://wa.me/33751019452?text=Bonjour, je souhaite un devis pour un événement ${currentPrestation.title} de ${guests} personnes.`}
                      className="btn btn-lg bg-accent text-white w-full shadow-glow"
                    >
                      Valider avec un expert
                    </a>
                  </motion.div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
                    <ClockIcon className="h-20 w-20 mb-6" />
                    <p className="font-display text-xl">Ajustez vos critères pour voir l&apos;estimation</p>
                  </div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </section>

      {/* --- SHOWCASE GALLERY --- */}
      <section className="py-20 xl:py-28 overflow-hidden bg-creamSoft">
        <div className="container-x mb-12">
          <h2 className="heading-display text-3xl xl:text-4xl text-primary">Nos Réalisations</h2>
        </div>
        <div className="flex gap-4 xl:gap-6 overflow-x-auto pb-8 px-4 no-scrollbar">
          {SHOWCASE_IMAGES.map((img, idx) => (
            <motion.div 
              key={idx}
              whileHover={{ scale: 1.05 }}
              className="relative h-[300px] w-[250px] sm:h-[400px] sm:w-[320px] shrink-0 overflow-hidden rounded-[2rem] shadow-xl"
            >
              <img src={img} alt="Réalisation Afro Miaam" className="h-full w-full object-cover" />
            </motion.div>
          ))}
        </div>
      </section>

      {/* --- REASSURANCE --- */}
      <section className="bg-white py-24 xl:py-32">
        <div className="container-x">
          <div className="text-center max-w-3xl mx-auto mb-20 xl:mb-24">
            <h2 className="heading-display text-4xl xl:text-5xl text-primary">Plus qu&apos;un traiteur, un <span className="text-accent">partenaire</span></h2>
            <p className="mt-4 text-primary/60">Nous prenons en charge chaque détail pour que vous puissiez vous concentrer sur l&apos;essentiel : vos invités.</p>
          </div>

          <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-4 xl:gap-16">
            <FeatureBox title="Logistique Totale" desc="Livraison, installation et reprise du matériel." />
            <FeatureBox title="Art de la Table" desc="Décoration aux couleurs et textures de l'Afrique." />
            <FeatureBox title="Sur-Mesure" desc="Adaptation aux régimes spéciaux (végan, sans gluten)." />
            <FeatureBox title="Pôle Boisson" desc="Cocktails signature, Bissap artisanal et vins fins." />
          </div>
        </div>
      </section>
    </div>
  );
}

function FeatureBox({ title, desc }: { title: string, desc: string }) {
  return (
    <div className="space-y-4">
      <div className="h-1 w-12 bg-accent rounded-full" />
      <h3 className="font-display font-black text-primary text-lg">{title}</h3>
      <p className="text-sm text-primary/60 leading-relaxed">{desc}</p>
    </div>
  );
}
