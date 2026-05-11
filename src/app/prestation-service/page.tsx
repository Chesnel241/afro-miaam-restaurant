import Image from "next/image";
import fs from "fs";
import path from "path";

// Server Component pour lire les images dynamiquement
export default function PrestationServicePage() {
  const imagesDir = path.join(process.cwd(), "public", "Anniversaire");
  let images: string[] = [];

  try {
    const files = fs.readdirSync(imagesDir);
    // Filtrer pour ne garder que les images (png, jpg, jpeg, webp)
    images = files.filter((file) =>
      /\.(png|jpe?g|webp|gif)$/i.test(file)
    );
  } catch (error) {
    console.error("Erreur lors de la lecture du dossier Anniversaire:", error);
  }

  return (
    <div className="container-x py-16 sm:py-24">
      <div className="mx-auto max-w-3xl text-center">
            <p className="eyebrow text-accentSoft">Événements sur-mesure</p>
            <h1 className="heading-display mt-3 text-[40px] leading-[1.1] sm:text-5xl md:text-6xl lg:text-7xl">
              Prestation <span className="text-accent italic">Service</span>
            </h1>
            <p className="mt-6 text-lg text-cream/90 max-w-xl">
              Vous avez un événement ? Besoin d&apos;un prestataire ? Afro Miaam
              s&apos;occupe de régaler vos convives avec nos spécialités
              afro-gastronomiques. Décrivez-nous votre projet !
            </p>
      </div>

      <div className="mt-16 grid gap-12 lg:grid-cols-[1fr_1fr]">
        {/* Formulaire de prestation */}
        <div className="rounded-2xl bg-creamSoft p-8 shadow-soft sm:p-10">
          <h2 className="heading-display text-2xl text-primary">Parlez-nous de votre projet</h2>
          <form className="mt-8 grid gap-6">
            <div>
              <label htmlFor="name" className="block text-sm font-bold text-primary">Nom complet</label>
              <input
                type="text"
                id="name"
                name="name"
                className="mt-2 block w-full rounded-md border-0 bg-white px-4 py-3 text-primary shadow-sm ring-1 ring-inset ring-cream/20 placeholder:text-primary/40 focus:ring-2 focus:ring-inset focus:ring-accent"
                placeholder="Votre nom"
                required
              />
            </div>
            
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor="date" className="block text-sm font-bold text-primary">Date de l&apos;évènement</label>
                <input
                  type="date"
                  id="date"
                  name="date"
                  className="mt-2 block w-full rounded-md border-0 bg-white px-4 py-3 text-primary shadow-sm ring-1 ring-inset ring-cream/20 focus:ring-2 focus:ring-inset focus:ring-accent"
                  required
                />
              </div>
              <div>
                <label htmlFor="location" className="block text-sm font-bold text-primary">Lieu</label>
                <input
                  type="text"
                  id="location"
                  name="location"
                  className="mt-2 block w-full rounded-md border-0 bg-white px-4 py-3 text-primary shadow-sm ring-1 ring-inset ring-cream/20 placeholder:text-primary/40 focus:ring-2 focus:ring-inset focus:ring-accent"
                  placeholder="Ville ou adresse"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="details" className="block text-sm font-bold text-primary">Description du projet</label>
              <textarea
                id="details"
                name="details"
                rows={5}
                className="mt-2 block w-full rounded-md border-0 bg-white px-4 py-3 text-primary shadow-sm ring-1 ring-inset ring-cream/20 placeholder:text-primary/40 focus:ring-2 focus:ring-inset focus:ring-accent"
                placeholder="Dites-nous en plus sur vos attentes, le nombre de convives, etc."
                required
              />
            </div>

            <button type="button" className="btn btn-lg btn-primary mt-2 justify-center w-full">
              Envoyer ma demande
            </button>
          </form>
        </div>

        {/* Galerie Pâtisseries */}
        <div>
          <h2 className="heading-display mb-8 text-2xl text-primary">Nos Pâtisseries d&apos;Exception</h2>
          {images.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2">
              {images.map((img) => (
                <div key={img} className="group overflow-hidden rounded-xl shadow-card bg-creamSoft flex items-center justify-center">
                  <Image
                    src={`/Anniversaire/${img}`}
                    alt={`Pâtisserie ${img}`}
                    width={600}
                    height={600}
                    className="w-full h-auto object-contain transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-primary/75">Aucune pâtisserie n&apos;est actuellement disponible dans notre catalogue.</p>
          )}
        </div>
      </div>
    </div>
  );
}
