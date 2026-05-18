"use client";

import type { Metadata } from "next";

export default function LegalPage() {
  return (
    <section className="py-16 bg-cream/35">
      <div className="container-x max-w-4xl space-y-8 rounded-3xl bg-white p-8 shadow-card sm:p-12 ring-1 ring-cream/20">
        <p className="eyebrow text-accent">Cadre Réglementaire</p>
        <h1 className="heading-display text-3xl text-primary sm:text-4xl lg:text-5xl">
          Mentions Légales
        </h1>
        <p className="text-sm text-primary/50 italic">En vigueur à compter du 18 Mai 2026</p>

        <hr className="border-cream/20" />

        <Block title="1. Éditeur du Site">
          Le site <strong>Afro Miaam</strong> est édité par l&apos;entreprise individuelle (Auto-entreprise) de <strong>Kecia NTSAME ABAGHA</strong>, 
          immatriculée au Répertoire des Entreprises et des Établissements à Lyon, 
          dont le siège social est situé à Lyon (69000), France.
          <br />
          <span className="inline-block mt-2 font-bold text-accent">Email de contact : afromiaam@gmail.com</span>
        </Block>

        <Block title="2. Directeur de la Publication">
          La Directrice de la publication du Site est <strong>Kecia NTSAME ABAGHA</strong>, en sa qualité d&apos;exploitante et propriétaire d&apos;Afro Miaam.
        </Block>

        <Block title="3. Hébergement du Site">
          Le site web est hébergé par la société <strong>Vercel Inc.</strong>, située au 650 2nd St, San Francisco, CA 94107, États-Unis. 
          Les serveurs de production et de base de données d'Afro Miaam sont localisés au sein de l'Union Européenne (Francfort, Allemagne) 
          afin de garantir une sécurité maximale et une stricte conformité RGPD.
        </Block>

        <Block title="4. Propriété Intellectuelle">
          L&apos;ensemble de ce site relève de la législation française et internationale sur le droit d&apos;auteur et la propriété intellectuelle. 
          Tous les droits de reproduction sont réservés, y compris pour les documents téléchargeables et les représentations iconographiques et photographiques. 
          La reproduction de tout ou partie de ce site sur un support électronique ou physique quel qu&apos;il soit est formellement interdite sauf autorisation expresse du directeur de la publication.
        </Block>

        <Block title="5. Service Clientèle">
          Pour toute question relative à l&apos;utilisation du site, à vos commandes en cours ou pour toute réclamation, 
          notre service clientèle est joignable via l&apos;adresse email <strong>afromiaam@gmail.com</strong> ou directement depuis notre formulaire de contact en ligne.
        </Block>
      </div>
    </section>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h2 className="font-display text-xl font-bold text-primary tracking-tight">{title}</h2>
      <p className="text-sm text-primary/75 leading-relaxed">{children}</p>
    </div>
  );
}
