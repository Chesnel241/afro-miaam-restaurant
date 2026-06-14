"use client";

import type { Metadata } from "next";

export default function CgvPage() {
  return (
    <section className="py-16 bg-cream/35">
      <div className="container-x max-w-4xl space-y-8 rounded-3xl bg-white p-8 shadow-card sm:p-12 ring-1 ring-cream/20">
        <p className="eyebrow text-accent">Conditions Générales</p>
        <h1 className="heading-display text-3xl text-primary sm:text-4xl lg:text-5xl">
          Conditions Générales de Vente
        </h1>
        <p className="text-sm text-primary/50 italic">Dernière mise à jour : 18 Mai 2026</p>

        <hr className="border-cream/20" />

        <Block title="1. Objet">
          Les présentes Conditions Générales de Vente (CGV) régissent sans restriction ni réserve l&apos;ensemble des réservations et précommandes 
          de repas et de services traiteurs effectuées par des clients non professionnels sur le site Internet <strong>afromiaam.com</strong> auprès de 
          l&apos;entreprise individuelle de <strong>Kecia NTSAME ABAGHA</strong> (propriétaire de la marque Afro Miaam). 
          Toute commande validée par le client implique l&apos;adhésion entière et sans réserve aux présentes CGV.
        </Block>

        <Block title="2. Produits et Allergènes">
          Les plats proposés à la vente sont ceux décrits sur le site. Les photographies et visuels sont les plus fidèles possibles mais ne sont pas contractuels. 
          <br />
          <span className="font-bold text-accent">⚠️ Avertissement Allergènes :</span> Nos plats peuvent contenir des allergènes majeurs (arachides, gluten, produits laitiers, etc.). 
          Les mentions de préférences alimentaires (végétarien, sans gluten, sans arachide, halal, épicé) sont fournies à titre informatif et gérées en temps réel. 
          Il relève de la responsabilité du client de signaler toute allergie sévère lors de sa précommande.
        </Block>

        <Block title="3. Processus de Commande & Acompte">
          Le client sélectionne ses produits sur le site et choisit un créneau de retrait ou de livraison (commande possible le jour même, avec un délai minimum de 3 heures avant le créneau choisi).
          Une commande n&apos;est définitivement enregistrée qu&apos;après validation par nos services et réception de l&apos;acompte obligatoire 
          destiné à couvrir les frais de préparation des denrées fraîches.
        </Block>

        <Block title="4. Tarifs et Règlement">
          Les prix de nos plats sont indiqués en Euros nets de taxe (TVA non applicable, en vertu de l&apos;article 293 B du Code Général des Impôts - CGI). 
          Le règlement s&apos;effectue de manière sécurisée en ligne pour la partie acompte, ou par téléphone lors de la confirmation par nos conseillers clients. 
          Afro Miaam se réserve le droit de suspendre ou d&apos;annuler toute exécution de commande en cas de défaut de paiement.
        </Block>

        <Block title="5. Modalités de Retrait et Livraison">
          - <strong>Retrait sur place</strong> : Disponible gratuitement à notre point de retrait à Lyon selon le créneau réservé.
          <br />
          - <strong>Livraison</strong> : Facturée forfaitairement 3 € pour la zone du Grand Lyon. 
          La livraison s&apos;effectue dans la tranche horaire convenue. Le client s&apos;engage à être présent pour réceptionner les plats chauds.
        </Block>

        <Block title="6. Droit de Rétractation et Annulation">
          Conformément à l&apos;article L.221-28 du Code de la consommation, le droit de rétractation ne peut être exercé pour les contrats de fourniture 
          de biens susceptibles de se détériorer ou de se périmer rapidement (plats préparés, denrées périssables). 
          Toute modification ou annulation de commande par le client doit intervenir au minimum 3 heures avant l&apos;heure prévue par appel direct
          au service clientèle. Passé ce délai, l&apos;acompte versé sera conservé.
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
