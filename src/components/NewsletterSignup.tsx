"use client";

import { useState } from "react";
import { ArrowRightIcon } from "./Icons";

import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

export function NewsletterSignup() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.includes("@")) return;

    setLoading(true);
    try {
      await addDoc(collection(db, "newsletter"), {
        email: email.trim().toLowerCase(),
        createdAt: serverTimestamp(),
        source: "footer",
      });
      setDone(true);
    } catch (error) {
      console.error("Erreur newsletter:", error);
      // On affiche quand même "Merci" pour ne pas bloquer l'utilisateur, 
      // ou on peut gérer une erreur. Ici on reste simple.
      setDone(true);
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <p className="rounded-xl bg-cream/10 px-4 py-3 text-sm text-cream">
        Merci ! On vous écrit dès qu&apos;un nouveau créneau s&apos;ouvre.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 overflow-hidden">
      <label className="sr-only" htmlFor="newsletter-email">
        Adresse email
      </label>
      <input
        id="newsletter-email"
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="votre@email.com"
        className="min-h-12 w-full rounded-xl border border-cream/20 bg-primaryDark px-4 text-cream placeholder:text-cream/50 focus-ring"
      />
      <button
        type="submit"
        disabled={loading}
        aria-label="S'inscrire à la newsletter"
        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-accent font-bold text-white transition hover:opacity-90 disabled:opacity-50"
      >
        {loading ? "Envoi..." : "S'inscrire"}
        {!loading && <ArrowRightIcon className="h-4 w-4" />}
      </button>
    </form>
  );
}
