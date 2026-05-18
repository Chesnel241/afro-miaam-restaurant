"use client";

import type { Metadata } from "next";

export default function PrivacyPage() {
  return (
    <section className="py-16 bg-cream/35">
      <div className="container-x max-w-4xl space-y-8 rounded-3xl bg-white p-8 shadow-card sm:p-12 ring-1 ring-cream/20">
        <p className="eyebrow text-accent">Confidentialité</p>
        <h1 className="heading-display text-3xl text-primary sm:text-4xl lg:text-5xl">
          Politique de Confidentialité (RGPD)
        </h1>
        <p className="text-sm text-primary/50 italic">Dernière mise à jour : 18 Mai 2026</p>

        <hr className="border-cream/20" />

        <Block title="1. Responsable du Traitement">
          L&apos;entreprise individuelle de <strong>Kecia NTSAME ABAGHA</strong>, sous l&apos;enseigne <strong>Afro Miaam</strong>, en sa qualité de responsable du traitement, s&apos;engage à ce que la collecte 
          et le traitement de vos données personnelles effectués sur le site <strong>afro-miaam.fr</strong> soient conformes au Règlement Général sur la Protection des Données (RGPD) 
          et à la loi Informatique et Libertés.
        </Block>

        <Block title="2. Données Personnelles Collectées">
          Dans le cadre de la gestion de votre compte et du traitement de vos commandes de repas, nous collectons les informations suivantes :
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li><strong>Identité</strong> : Nom, prénom, civilité.</li>
            <li><strong>Coordonnées</strong> : Adresse de courrier électronique (email), numéro de téléphone portable, adresse complète de livraison.</li>
            <li><strong>Historique d&apos;achat</strong> : Plats réservés, préférences alimentaires enregistrées, transactions du portefeuille fidélité.</li>
            <li><strong>Navigation</strong> : Adresse IP, logs système et cookies techniques nécessaires à l&apos;authentification de votre session.</li>
          </ul>
        </Block>

        <Block title="3. Finalités du Traitement">
          Vos données personnelles sont traitées pour les objectifs stricts suivants :
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>La gestion complète de votre compte client et le suivi de vos commandes.</li>
            <li>Le rappel téléphonique pour la validation finale de vos commandes de plats chauds.</li>
            <li>L&apos;application de vos avantages fidélité, codes promotionnels, et crédits de parrainage.</li>
            <li>L&apos;envoi de notre lettre d&apos;information (newsletter) si vous y avez consenti expressément.</li>
          </ul>
        </Block>

        <Block title="4. Durée de Conservation des Données">
          Vos données d&apos;identification et de livraison sont conservées pendant toute la durée active de votre relation commerciale avec Afro Miaam, 
          puis archivées pendant 5 ans au titre de la prescription civile et 10 ans au titre des obligations comptables légales. 
          Pour les inscrits à la newsletter, vos données sont supprimées sous 3 ans à compter du dernier contact ou dès votre désinscription.
        </Block>

        <Block title="5. Vos Droits">
          Conformément à la réglementation européenne, vous disposez d&apos;un droit d&apos;accès, de rectification, d&apos;effacement (droit à l&apos;oubli), 
          de portabilité et de limitation du traitement de vos données. Vous pouvez exercer ces droits à tout moment en nous envoyant un simple email à 
          <strong> afromiaam@gmail.com</strong>. Notre délégué à la protection des données (DPO) traitera votre demande sous un délai maximum de 30 jours.
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
