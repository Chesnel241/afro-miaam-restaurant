# Afro Miaam — site de précommande

Site Next.js + TypeScript + Tailwind du restaurant Afro Miaam.

> **Modèle MVP — sans paiement en ligne.**
> Le client compose son panier, choisit un créneau (24h minimum à
> l'avance) puis remplit ses coordonnées. L'équipe le rappelle pour
> finaliser le paiement par téléphone.

## Démarrer

```bash
npm install
npm run dev
```

L'application est accessible sur `http://localhost:3000`.

## Build de production

```bash
npm run build
npm run start
```

## Structure

```
src/
├─ app/                  Pages App Router (accueil, menu, panier, réservation…)
│  └─ api/reservation/   API route MVP (log console, à brancher email/Sheets)
├─ components/           Header, Footer, Hero, ProductCard, CartContext…
├─ data/menu.ts          Catalogue produits
└─ lib/                  Types, utilitaires, logique de réservation
```

## À brancher avant la mise en ligne

- Photos officielles (les images Unsplash sont temporaires).
- Coordonnées légales (mentions, hébergeur, adresse).
- Notification de réservation : email/SMS/Sheets/Notion dans
  `src/app/api/reservation/route.ts`.
- Numéro de téléphone et email dans `src/app/contact/page.tsx` et le
  footer.

### Avatar du chatbot

Le bouton flottant en bas à droite affiche l'avatar du chatbot. Pour
utiliser la vraie photo de l'employée :

1. Enregistre ton image (jpg ou png) sous **`public/chatbot-avatar.png`**
2. C'est tout — la photo prend automatiquement la place du SVG par défaut

Tant que ce fichier n'existe pas, le composant retombe sur
`public/chatbot-avatar.svg` (illustration brand) qui sert de placeholder.

### Base de connaissances du chatbot

Toutes les questions/réponses sont centralisées dans
`src/data/chatbot.ts` — ajoute un nouveau topic (id, label, mots-clés,
réponse, CTA optionnel) pour enrichir la base.
