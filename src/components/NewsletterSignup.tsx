"use client";

import { useState } from "react";
import { ArrowRightIcon } from "./Icons";

export function NewsletterSignup() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.includes("@")) return;
    setDone(true);
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
        aria-label="S'inscrire à la newsletter"
        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-accent font-bold text-white transition hover:opacity-90"
      >
        S&apos;inscrire
        <ArrowRightIcon className="h-4 w-4" />
      </button>
    </form>
  );
}
