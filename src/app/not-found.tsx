"use client";

import Link from "next/link";
import { LottiePlayer } from "@/components/LottiePlayer";

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
      <div className="w-64 h-64 md:w-80 md:h-80 mb-8 relative">
        <LottiePlayer src="error 404.json" autoplay loop speed={1} />
      </div>
      <h1 className="heading-display text-4xl font-bold text-primary mb-4">Oups... La page est introuvable</h1>
      <p className="text-primary/70 mb-8 max-w-md">
        Désolé, mais la page que vous recherchez n'existe pas ou a été déplacée. Ne vous inquiétez pas, notre menu est toujours là !
      </p>
      <Link href="/menu" className="btn btn-primary px-8 py-3">
        Retourner au Menu
      </Link>
    </div>
  );
}
