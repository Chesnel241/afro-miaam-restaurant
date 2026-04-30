"use client";

import { useState } from "react";

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
      <p className="rounded-full bg-afro-cream/10 px-5 py-3 text-afro-cream">
        Merci ! On vous écrit dès qu&apos;un nouveau créneau s&apos;ouvre.
      </p>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-full flex-col gap-3 sm:flex-row md:max-w-md"
    >
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
        className="min-h-12 flex-1 rounded-full border border-afro-cream/20 bg-afro-green-deep px-5 text-afro-cream placeholder:text-afro-cream/50 focus-ring"
      />
      <button type="submit" className="btn btn-md btn-primary">
        Je m&apos;inscris
      </button>
    </form>
  );
}
