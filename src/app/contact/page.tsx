"use client";

import { useState } from "react";

export default function ContactPage() {
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", message: "" });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // MVP : aucun back-end de contact branché. On simule un envoi côté client.
    setSent(true);
  }

  return (
    <>
      <section className="bg-primary pt-10 pb-10 text-cream sm:pt-16 sm:pb-12">
        <div className="container-x">
          <p className="eyebrow text-accentSoft">Contact</p>
          <h1 className="heading-display mt-3 text-3xl sm:text-4xl lg:text-6xl">
            Une question, un événement&nbsp;?
          </h1>
          <p className="mt-4 max-w-2xl text-cream/85">
            Écrivez-nous, on revient vers vous très vite.
          </p>
        </div>
      </section>

      <section className="py-16">
        <div className="container-x grid gap-10 lg:grid-cols-[1fr_1fr]">
          <div className="space-y-4">
            <InfoCard
              title="Téléphone"
              value="+33 (0)6 00 00 00 00"
              note="Lun – Sam, 10h – 19h"
            />
            <InfoCard
              title="Email"
              value="bonjour@afro-miaam.fr"
              note="Réponse sous 24h"
            />
            <InfoCard
              title="Zone de livraison"
              value="Lyon — 2 € de frais"
              note="Tous les arrondissements"
            />
            <InfoCard
              title="Précommande"
              value="24h minimum à l'avance"
              note="Pour une cuisine fraîche, préparée à la commande"
            />
          </div>

          <div className="rounded-lg bg-white p-6 shadow-soft sm:p-8">
            {sent ? (
              <div className="text-center">
                <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-accent/15 text-2xl text-accent">
                  ✓
                </div>
                <h2 className="heading-display mt-4 text-2xl text-primary">
                  Message envoyé&nbsp;!
                </h2>
                <p className="mt-2 text-primary/70">
                  Merci, on revient vers vous au plus vite.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <h2 className="heading-display text-2xl text-primary">
                  Envoyez-nous un message
                </h2>
                <Field label="Nom" htmlFor="name" required>
                  <input
                    id="name"
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="contact-input"
                  />
                </Field>
                <Field label="Email" htmlFor="email" required>
                  <input
                    id="email"
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="contact-input"
                  />
                </Field>
                <Field label="Message" htmlFor="message" required>
                  <textarea
                    id="message"
                    rows={5}
                    required
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    className="contact-input min-h-[120px] resize-y py-3"
                  />
                </Field>
                <button type="submit" className="btn btn-md btn-primary w-full">
                  Envoyer le message
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      <style jsx>{`
        :global(.contact-input) {
          width: 100%;
          min-height: 48px;
          border-radius: 12px;
          border: 1px solid rgba(31, 61, 43, 0.15);
          background: #fff;
          padding: 0 14px;
          color: #1a1a1a;
          font-size: 16px;
        }
        :global(.contact-input:focus-visible) {
          outline: none;
          border-color: #e85d2a;
          box-shadow: 0 0 0 4px rgba(232, 93, 42, 0.18);
        }
      `}</style>
    </>
  );
}

function InfoCard({
  title,
  value,
  note,
}: {
  title: string;
  value: string;
  note: string;
}) {
  return (
    <div className="rounded-lg bg-white p-5 shadow-soft">
      <p className="text-xs font-bold uppercase tracking-wide text-accent">
        {title}
      </p>
      <p className="mt-1 font-display text-xl font-bold text-primary">
        {value}
      </p>
      <p className="text-sm text-primary/65">{note}</p>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  required,
  children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label htmlFor={htmlFor} className="flex flex-col gap-1.5">
      <span className="text-sm font-semibold text-primary">
        {label} {required && <span className="text-accent">*</span>}
      </span>
      {children}
    </label>
  );
}
