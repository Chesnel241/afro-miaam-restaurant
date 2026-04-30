export type ChatCta = {
  label: string;
  href: string;
};

export type ChatTopic = {
  id: string;
  label: string;
  keywords: string[];
  answer: string;
  cta?: ChatCta;
};

export const CHAT_TOPICS: ChatTopic[] = [
  {
    id: "menu",
    label: "C'est quoi au menu ?",
    keywords: [
      "menu",
      "carte",
      "plat",
      "manger",
      "signature",
      "boisson",
      "dessert",
      "entree",
      "entrée",
      "yassa",
      "mafe",
      "thieboudienne",
    ],
    answer:
      "Au menu : 3 signatures (Poulet Yassa revisité, Mafé de bœuf onctueux, Saumon braisé sauce gingembre), des plats principaux, accompagnements, sauces maison, desserts et boissons. Tout est fait maison, à la commande.",
    cta: { label: "Voir le menu", href: "/menu" },
  },
  {
    id: "delivery",
    label: "Comment ça marche la livraison ?",
    keywords: [
      "livraison",
      "livrer",
      "transport",
      "frais",
      "envoyer",
      "venir",
    ],
    answer:
      "On livre dans Lyon pour 2 € seulement. Le retrait sur place est gratuit — l'adresse exacte vous est communiquée après confirmation par téléphone.",
    cta: { label: "Comment ça marche", href: "/comment-ca-marche" },
  },
  {
    id: "delay",
    label: "Quel délai pour commander ?",
    keywords: [
      "délai",
      "delai",
      "avance",
      "24h",
      "quand",
      "préparer",
      "preparer",
      "rapide",
      "vite",
      "demain",
      "jour-meme",
      "jour même",
    ],
    answer:
      "Minimum 24 heures à l'avance. Vous choisissez la date et le créneau au moment de la réservation. Pas de jour-même : c'est ce qui nous permet de cuisiner du frais, juste pour vous.",
  },
  {
    id: "phone",
    label: "Comment vous contacter ?",
    keywords: [
      "téléphone",
      "telephone",
      "contact",
      "appeler",
      "joindre",
      "numéro",
      "numero",
      "email",
      "mail",
    ],
    answer:
      "Par téléphone au +33 (0)6 00 00 00 00 (Lun – Sam, 10h – 19h) ou par email à bonjour@afro-miaam.fr.",
    cta: { label: "Page contact", href: "/contact" },
  },
  {
    id: "where",
    label: "Vous êtes où ?",
    keywords: [
      "où",
      "ou",
      "ville",
      "lyon",
      "adresse",
      "emplacement",
      "localisation",
      "situé",
      "situe",
    ],
    answer:
      "Le restaurant est basé à Lyon. L'adresse précise de retrait est envoyée par téléphone après validation de votre commande. La livraison couvre tous les arrondissements de Lyon.",
  },
  {
    id: "payment",
    label: "Comment je paie ?",
    keywords: [
      "paiement",
      "payer",
      "carte",
      "espèces",
      "especes",
      "cb",
      "régler",
      "regler",
      "prix",
    ],
    answer:
      "Pour cette première version, le paiement se fait par téléphone après validation de votre commande. Aucun paiement n'est demandé sur le site — vous réservez, on vous rappelle.",
  },
  {
    id: "outside",
    label: "Vous livrez en dehors de Lyon ?",
    keywords: [
      "banlieue",
      "ailleurs",
      "extérieur",
      "exterieur",
      "villeurbanne",
      "caluire",
      "vénissieux",
      "venissieux",
      "bron",
      "oullins",
    ],
    answer:
      "Pour le moment, on livre uniquement dans Lyon intra-muros. On vous tient au courant si on étend la zone — inscrivez-vous à la newsletter !",
  },
  {
    id: "cancel",
    label: "Comment annuler ma commande ?",
    keywords: ["annuler", "modifier", "changer", "annulation"],
    answer:
      "Vous pouvez modifier ou annuler votre réservation jusqu'à 24h avant le créneau choisi. Contactez-nous par téléphone ou via la page contact.",
    cta: { label: "Page contact", href: "/contact" },
  },
  {
    id: "allergies",
    label: "Vous gérez les allergies ?",
    keywords: [
      "allergie",
      "allergique",
      "gluten",
      "lactose",
      "halal",
      "casher",
      "végétarien",
      "vegetarien",
      "vegan",
      "régime",
      "regime",
    ],
    answer:
      "Indiquez vos allergies ou régime dans le champ « Note » au moment de la réservation. On a aussi un Bowl végétarien sur la carte. On vous rappelle si on a besoin de précisions.",
  },
  {
    id: "events",
    label: "Vous faites des événements ?",
    keywords: [
      "événement",
      "evenement",
      "groupe",
      "anniversaire",
      "mariage",
      "entreprise",
      "buffet",
      "traiteur",
    ],
    answer:
      "Oui, on adore. Anniversaires, repas d'entreprise, événements privés — écrivez-nous via la page contact en précisant la date, le nombre de convives et vos envies.",
    cta: { label: "Nous écrire", href: "/contact" },
  },
];

const DEFAULT_ANSWER =
  "Bonne question ! Je n'ai pas la réponse exacte ici. Le plus simple est de nous écrire ou de nous appeler — on revient vers vous très vite.";

export function findTopic(input: string): ChatTopic | null {
  const normalized = input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

  let best: { topic: ChatTopic; score: number } | null = null;

  for (const topic of CHAT_TOPICS) {
    let score = 0;
    for (const kw of topic.keywords) {
      const k = kw
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "");
      if (normalized.includes(k)) {
        score += k.length;
      }
    }
    if (score > 0 && (!best || score > best.score)) {
      best = { topic, score };
    }
  }

  return best?.topic ?? null;
}

export function answerFor(input: string): { answer: string; cta?: ChatCta } {
  const topic = findTopic(input);
  if (!topic) return { answer: DEFAULT_ANSWER };
  return { answer: topic.answer, cta: topic.cta };
}
