"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { CheckIcon } from "@/components/Icons";

// Images anniversaire en dur (compatible client component)
const ANNIVERSARY_IMAGES = [
  "patisserie1.png",
  "patisserie2.png",
];

export default function PrestationServicePage() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    date: "",
    location: "",
    guests: "",
    details: "",
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.phone || !form.date || !form.details) return;
    
    setLoading(true);
    try {
      await addDoc(collection(db, "prestations"), {
        ...form,
        status: "Nouveau",
        createdAt: serverTimestamp(),
      });
      setSuccess(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      console.error("Erreur envoi prestation:", err);
      // Fallback : ouvrir WhatsApp avec les infos
      const msg = encodeURIComponent(
        `Bonjour Afro Miaam ! Je souhaite une prestation service.\n\nNom: ${form.name}\nTél: ${form.phone}\nDate: ${form.date}\nLieu: ${form.location}\nConvives: ${form.guests}\n\nDétails: ${form.details}`
      );
      window.open(`https://wa.me/33749953553?text=${msg}`, "_blank");
      setSuccess(true);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="container-x py-24 sm:py-32 text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100 text-green-600">
          <CheckIcon className="h-10 w-10" />
        </div>
        <h1 className="heading-display text-3xl text-primary sm:text-4xl">Demande envoyée !</h1>
        <p className="mt-4 text-primary/75 max-w-lg mx-auto">
          Merci <strong className="text-primary">{form.name}</strong> ! Notre équipe va étudier votre projet
          et vous recontactera rapidement pour discuter des détails.
        </p>
        <a href="/" className="btn btn-primary mt-10 inline-flex px-10">Retour à l&apos;accueil</a>
      </div>
    );
  }

  return (
    <div className="container-x py-16 sm:py-24">
      <div className="mx-auto max-w-3xl text-center">
            <p className="eyebrow text-accent">Événements sur-mesure</p>
            <h1 className="heading-display mt-3 text-[40px] leading-[1.1] sm:text-5xl md:text-6xl lg:text-7xl text-primary">
              Prestation <span className="text-accent italic">Service</span>
            </h1>
            <p className="mt-6 text-lg text-primary/70 max-w-xl mx-auto">
              Vous avez un événement ? Besoin d&apos;un prestataire ? Afro Miaam
              s&apos;occupe de régaler vos convives avec nos spécialités
              afro-gastronomiques. Décrivez-nous votre projet !
            </p>
      </div>

      <div className="mt-16 grid gap-12 lg:grid-cols-[1fr_1fr]">
        {/* Formulaire de prestation */}
        <div className="rounded-3xl bg-creamSoft p-8 shadow-soft sm:p-10">
          <h2 className="heading-display text-2xl text-primary">Parlez-nous de votre projet</h2>
          <form onSubmit={handleSubmit} className="mt-8 grid gap-6">
            <div>
              <label htmlFor="name" className="block text-sm font-bold text-primary">Nom complet</label>
              <input
                type="text"
                id="name"
                name="name"
                value={form.name}
                onChange={handleChange}
                className="mt-2 block w-full rounded-xl border-0 bg-white px-4 py-3 text-primary shadow-sm ring-1 ring-inset ring-cream/20 placeholder:text-primary/40 focus:ring-2 focus:ring-inset focus:ring-accent outline-none"
                placeholder="Votre nom"
                required
              />
            </div>
            
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor="email" className="block text-sm font-bold text-primary">Email</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  className="mt-2 block w-full rounded-xl border-0 bg-white px-4 py-3 text-primary shadow-sm ring-1 ring-inset ring-cream/20 placeholder:text-primary/40 focus:ring-2 focus:ring-inset focus:ring-accent outline-none"
                  placeholder="votre@email.com"
                />
              </div>
              <div>
                <label htmlFor="phone" className="block text-sm font-bold text-primary">Téléphone</label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  className="mt-2 block w-full rounded-xl border-0 bg-white px-4 py-3 text-primary shadow-sm ring-1 ring-inset ring-cream/20 placeholder:text-primary/40 focus:ring-2 focus:ring-inset focus:ring-accent outline-none"
                  placeholder="06 00 00 00 00"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor="date" className="block text-sm font-bold text-primary">Date de l&apos;événement</label>
                <input
                  type="date"
                  id="date"
                  name="date"
                  value={form.date}
                  onChange={handleChange}
                  className="mt-2 block w-full rounded-xl border-0 bg-white px-4 py-3 text-primary shadow-sm ring-1 ring-inset ring-cream/20 focus:ring-2 focus:ring-inset focus:ring-accent outline-none"
                  required
                />
              </div>
              <div>
                <label htmlFor="location" className="block text-sm font-bold text-primary">Lieu</label>
                <input
                  type="text"
                  id="location"
                  name="location"
                  value={form.location}
                  onChange={handleChange}
                  className="mt-2 block w-full rounded-xl border-0 bg-white px-4 py-3 text-primary shadow-sm ring-1 ring-inset ring-cream/20 placeholder:text-primary/40 focus:ring-2 focus:ring-inset focus:ring-accent outline-none"
                  placeholder="Ville ou adresse"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="guests" className="block text-sm font-bold text-primary">Nombre de convives estimé</label>
              <input
                type="text"
                id="guests"
                name="guests"
                value={form.guests}
                onChange={handleChange}
                className="mt-2 block w-full rounded-xl border-0 bg-white px-4 py-3 text-primary shadow-sm ring-1 ring-inset ring-cream/20 placeholder:text-primary/40 focus:ring-2 focus:ring-inset focus:ring-accent outline-none"
                placeholder="Ex: 50 personnes"
              />
            </div>

            <div>
              <label htmlFor="details" className="block text-sm font-bold text-primary">Description du projet</label>
              <textarea
                id="details"
                name="details"
                rows={5}
                value={form.details}
                onChange={handleChange}
                className="mt-2 block w-full rounded-xl border-0 bg-white px-4 py-3 text-primary shadow-sm ring-1 ring-inset ring-cream/20 placeholder:text-primary/40 focus:ring-2 focus:ring-inset focus:ring-accent outline-none"
                placeholder="Dites-nous en plus sur vos attentes, le type d'événement, vos préférences culinaires, etc."
                required
              />
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="btn btn-lg btn-primary mt-2 justify-center w-full disabled:opacity-50"
            >
              {loading ? "Envoi en cours..." : "Envoyer ma demande"}
            </button>
          </form>
        </div>

        {/* Galerie Pâtisseries */}
        <div>
          <h2 className="heading-display mb-8 text-2xl text-primary">Nos Pâtisseries d&apos;Exception</h2>
          <div className="grid gap-6 sm:grid-cols-2">
            {ANNIVERSARY_IMAGES.map((img) => (
              <div key={img} className="group overflow-hidden rounded-2xl shadow-card bg-creamSoft flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/img/anniversaire/${img}`}
                  alt={`Pâtisserie ${img.replace(/\.\w+$/, "")}`}
                  className="w-full h-auto object-contain transition-transform duration-500 group-hover:scale-105"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
