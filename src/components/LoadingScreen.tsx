"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

const INTRO_SHOWN_KEY = "afro_miaam_intro_v1";

export function LoadingScreen() {
  const [stage, setStage] = useState<"text1" | "video" | "logo" | "complete" | "hidden">("hidden");
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const t1 = useRef<NodeJS.Timeout | null>(null);
  const t2 = useRef<NodeJS.Timeout | null>(null);
  const t3 = useRef<NodeJS.Timeout | null>(null);

  // Initialisation : on ne joue l'intro qu'une fois par session
  useEffect(() => {
    const hasShown = sessionStorage.getItem(INTRO_SHOWN_KEY);
    if (hasShown) {
      setStage("complete");
      return;
    }

    // Sinon on lance l'intro
    setStage("text1");

    // Stage 1: Text "Tout commence par une odeur..."
    t1.current = setTimeout(() => {
      setStage("video");
      t2.current = setTimeout(() => {
        setStage("logo");
      }, 1000);
    }, 2500);

    // Stage 3: Transition vers le site
    t3.current = setTimeout(() => {
      handleSkip();
    }, 9500);

    return () => {
      clearAllTimers();
    };
  }, []);

  const clearAllTimers = () => {
    if (t1.current) clearTimeout(t1.current);
    if (t2.current) clearTimeout(t2.current);
    if (t3.current) clearTimeout(t3.current);
  };

  const handleSkip = () => {
    clearAllTimers();
    sessionStorage.setItem(INTRO_SHOWN_KEY, "true");
    setStage("complete");
    document.body.style.overflow = "auto";
  };

  useEffect(() => {
    if (stage === "complete" || stage === "hidden") {
      document.body.style.overflow = "auto";
    } else {
      document.body.style.overflow = "hidden";
    }
  }, [stage]);

  const [soundBlocked, setSoundBlocked] = useState(false);

  useEffect(() => {
    if (stage === "video" && audioRef.current) {
      audioRef.current.volume = 0.3;
      audioRef.current.play()
        .then(() => setSoundBlocked(false))
        .catch(() => {
          console.log("Autoplay blocked by browser");
          setSoundBlocked(true);
        });
    }
  }, [stage]);

  if (stage === "complete" || stage === "hidden") return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black overflow-hidden flex items-center justify-center">
      {/* Audio hidden */}
      <audio 
        ref={audioRef} 
        src="https://cdn.pixabay.com/audio/2022/03/10/audio_c8e9d3d9e8.mp3" // Sizzling sound
        loop 
      />


      {/* Vapor / Smoke particles overlay */}
      <SmokeParticles />


      <AnimatePresence mode="wait">
        {stage === "text1" && (
          <motion.div
            key="text1"
            initial={{ opacity: 0, letterSpacing: "0.2em" }}
            animate={{ opacity: 1, letterSpacing: "0.05em" }}
            exit={{ opacity: 0, filter: "blur(10px)" }}
            transition={{ duration: 2, ease: "easeInOut" }}
            className="relative z-20 text-center px-6"
          >
            <p className="font-display text-2xl sm:text-4xl text-cream font-extralight italic tracking-wide drop-shadow-lg">
              “Tout commence par une odeur…”
            </p>
          </motion.div>
        )}

        {(stage === "video" || stage === "logo") && (
          <motion.div
            key="cinematic"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2 }}
            className="absolute inset-0 w-full h-full"
          >
            {/* Background Cinematic Video */}
            <video
              ref={videoRef}
              autoPlay
              muted
              loop
              playsInline
              className="absolute inset-0 w-full h-full object-cover opacity-60 scale-105 animate-slow-zoom"
              src="https://assets.mixkit.co/videos/preview/mixkit-sizzling-meat-on-a-hot-grill-41165-large.mp4"
            />
            
            {/* Dark overlay for depth */}
            <div className="absolute inset-0 bg-gradient-to-b from-black via-transparent to-black opacity-80" />
            <div className="absolute inset-0 bg-black/40" />

            {/* Logo Overlay */}
            {stage === "logo" && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, letterSpacing: "0.5em" }}
                animate={{ opacity: 1, scale: 1, letterSpacing: "0.2em" }}
                transition={{ duration: 2, ease: "easeOut" }}
                className="absolute inset-0 flex flex-col items-center justify-center text-center px-6"
              >
                <div className="flex flex-col items-center gap-4">
                   {/* Person Cooking Animation */}
                   <motion.div 
                     initial={{ opacity: 0, y: 10 }}
                     animate={{ opacity: 1, y: 0 }}
                     transition={{ delay: 0.5, duration: 1 }}
                     className="mb-2"
                   >
                     <svg viewBox="0 0 100 100" className="w-20 h-20 text-cream/80" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        {/* Pot */}
                        <path d="M30 70 h40 L65 90 H35 Z" fill="currentColor" opacity="0.2" />
                        <path d="M30 70 Q25 70 25 65" />
                        <path d="M70 70 Q75 70 75 65" />
                        <rect x="30" y="68" width="40" height="4" rx="2" fill="currentColor" />
                        
                        {/* Person / Arm stirring */}
                        <motion.g
                          animate={{ rotate: [0, 10, -10, 0], x: [0, 2, -2, 0] }}
                          transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                          style={{ transformOrigin: "50% 30%" }}
                        >
                          {/* Arm */}
                          <path d="M50 20 L55 50" strokeWidth="4" />
                          {/* Ladle */}
                          <path d="M55 50 L58 75" strokeWidth="2" />
                          <circle cx="58" cy="75" r="5" fill="currentColor" />
                        </motion.g>
                        
                        {/* Steam bubbles */}
                        <motion.circle cx="40" cy="60" r="2" fill="currentColor" animate={{ y: [0, -15], opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 2, delay: 0.5 }} />
                        <motion.circle cx="60" cy="60" r="1.5" fill="currentColor" animate={{ y: [0, -20], opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 2.5, delay: 1 }} />
                     </svg>
                   </motion.div>

                   <div className="relative">
                      <h1 className="font-display text-6xl sm:text-8xl md:text-9xl font-extrabold text-cream uppercase tracking-widest drop-shadow-2xl">
                        Afro
                      </h1>
                      <div className="absolute -top-8 -right-8 w-20 h-20 bg-accent rounded-full blur-2xl opacity-50 animate-pulse" />
                   </div>
                   <h2 className="font-display text-6xl sm:text-8xl md:text-9xl font-extrabold text-cream uppercase tracking-widest -mt-4 sm:-mt-8">
                     Miaam
                   </h2>
                </div>
                <motion.p 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1, duration: 1 }}
                  className="mt-8 text-accent font-body font-bold uppercase tracking-[0.4em] text-xs sm:text-sm"
                >
                  Restaurant Afro Gastronomique
                </motion.p>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Steam / Vapor Overlay (Always present after first stage) */}
      {stage !== "text1" && (
        <div className="absolute inset-0 pointer-events-none z-20">
          <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-black to-transparent opacity-60" />
          {/* CSS based steam particles could be added here for extra depth */}
        </div>
      )}

      {/* Skip Button */}
      <button 
        onClick={handleSkip}
        className="absolute bottom-10 right-10 z-50 text-[10px] font-black uppercase tracking-widest text-cream/30 hover:text-cream transition-colors"
      >
        Passer l&apos;intro
      </button>

      <style jsx global>{`
        @keyframes slow-zoom {
          from { transform: scale(1.05); }
          to { transform: scale(1.15); }
        }
        .animate-slow-zoom {
          animation: slow-zoom 20s ease-in-out infinite alternate;
        }
      `}</style>
    </div>
  );
}

// Particles are decorative; we compute their randomized positions ONCE at
// mount via useMemo so subsequent re-renders are stable (avoids the
// react-hooks/purity ESLint rule and keeps animations consistent).
function SmokeParticles() {
  const particles = useMemo(
    () =>
      Array.from({ length: 6 }, () => ({
        left: Math.random() * 100,
        width: 150 + Math.random() * 200,
        height: 150 + Math.random() * 200,
        delay: Math.random() * 8,
        duration: 10 + Math.random() * 5,
      })),
    [],
  );

  return (
    <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
      {particles.map((p, i) => (
        <div
          key={i}
          className="smoke-particle"
          style={{
            left: `${p.left}%`,
            bottom: "-5%",
            width: `${p.width}px`,
            height: `${p.height}px`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}
    </div>
  );
}
