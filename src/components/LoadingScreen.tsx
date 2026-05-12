"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

const INTRO_SHOWN_KEY = "afro_miaam_intro_v1";

export function LoadingScreen() {
  const [stage, setStage] = useState<"text1" | "video" | "logo" | "complete">("text1");
  const [hasInteracted, setHasInteracted] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const t1 = useRef<NodeJS.Timeout | null>(null);
  const t2 = useRef<NodeJS.Timeout | null>(null);
  const t3 = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Stage 1: Text "Tout commence par une odeur..."
    t1.current = setTimeout(() => {
      setStage("video");
    }, 3000);

    // Stage 2: Video sequence starts, then logo (Auto fallback if no interaction)
    t2.current = setTimeout(() => {
      setStage("logo");
    }, 8000);

    // Stage 3: Complete (Auto fallback)
    t3.current = setTimeout(() => {
      setStage("complete");
    }, 12000);

    return () => {
      if (t1.current) clearTimeout(t1.current);
      if (t2.current) clearTimeout(t2.current);
      if (t3.current) clearTimeout(t3.current);
    };
  }, []);

  useEffect(() => {
    if (stage === "complete") {
      document.body.style.overflow = "auto";
    } else {
      document.body.style.overflow = "hidden";
    }
  }, [stage]);

  const handleStart = () => {
    setHasInteracted(true);
    
    // Clear previous auto timeouts
    if (t2.current) clearTimeout(t2.current);
    if (t3.current) clearTimeout(t3.current);

    if (audioRef.current) {
      audioRef.current.volume = 0.3;
      audioRef.current.play().catch(e => console.log("Audio play blocked", e));
    }
    if (videoRef.current) {
      videoRef.current.play().catch(e => console.log("Video play blocked", e));
    }

    // Trigger logo exactly 1s after interaction as requested
    setTimeout(() => {
      setStage("logo");
    }, 1000);

    // Transition to site 4s after logo
    setTimeout(() => {
      setStage("complete");
    }, 5000);
  };

  if (stage === "complete") return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black overflow-hidden flex items-center justify-center">
      {/* Audio hidden */}
      <audio 
        ref={audioRef} 
        src="https://cdn.pixabay.com/audio/2022/03/10/audio_c8e9d3d9e8.mp3" // Sizzling sound
        loop 
      />

      {/* Interaction Layer for Audio (Browsers require interaction) */}
      {!hasInteracted && stage !== "text1" && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={handleStart}
          className="absolute z-[10000] px-8 py-3 rounded-full border border-cream/30 text-cream bg-black/40 backdrop-blur-md hover:bg-cream hover:text-black transition-all font-display uppercase tracking-[0.2em] text-xs"
        >
          Entrer dans la cuisine
        </motion.button>
      )}

      {/* Vapor / Smoke particles overlay */}
      <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="smoke-particle"
            style={{
              left: `${Math.random() * 100}%`,
              bottom: "-5%",
              width: `${150 + Math.random() * 200}px`,
              height: `${150 + Math.random() * 200}px`,
              animationDelay: `${Math.random() * 8}s`,
              animationDuration: `${10 + Math.random() * 5}s`,
            }}
          />
        ))}
      </div>

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
              muted={!hasInteracted}
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
        onClick={() => setStage("complete")}
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
