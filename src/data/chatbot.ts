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
      "On livre dans Lyon pour 2 € seulement. Le retrait sur place est gratuit, l'adresse exacte vous est communiquée après confirmation par téléphone.",
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
      "Par téléphone au +33 (0)6 00 00 00 00 (Lun, Sam, 10h, 19h) ou par email à bonjour@afro-miaam.fr.",
    cta: { label: "Page contact", href: "/contact" },
  },
  {
    id: "callback",
    label: "Vous pouvez me rappeler ?",
    keywords: [
      "rappel",
      "rappelez",
      "rappeler",
      "callback",
      "rappel téléphonique",
      "me rappeler",
      "rappel telephonique",
    ],
    answer:
      "Avec plaisir. Laissez-nous votre numéro juste ici dans le chat (par ex. 06 12 34 56 78), et on vous rappelle dans la journée. Vous pouvez aussi nous écrire via la page contact, on revient vers vous très vite.",
    cta: { label: "Page contact", href: "/contact" },
  },
  {
    id: "human",
    label: "Je veux parler à un humain",
    keywords: [
      "humain",
      "vraie personne",
      "quelqu'un",
      "quelqu un",
      "conseiller",
      "personne",
      "operateur",
      "opérateur",
    ],
    answer:
      "Je transmets ! Laissez-nous votre numéro dans le chat ou écrivez-nous via la page contact, un membre de l'équipe Afro Miaam vous rappelle en journée.",
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
    id: "hours",
    label: "Quels sont les horaires ?",
    keywords: [
      "horaire",
      "horaires",
      "ouvert",
      "ouverture",
      "fermé",
      "ferme",
      "fermeture",
      "dimanche",
      "lundi",
      "samedi",
      "midi",
      "soir",
      "matin",
    ],
    answer:
      "On prend les commandes 7j/7 sur le site. L'équipe est joignable du lundi au samedi, 10h à 19h. Les retraits et livraisons se font sur les créneaux proposés à la réservation (midi et soir).",
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
      "Pour cette première version, le paiement se fait par téléphone après validation de votre commande. Aucun paiement n'est demandé sur le site, vous réservez, on vous rappelle.",
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
      "Pour le moment, on livre uniquement dans Lyon intra-muros. On vous tient au courant si on étend la zone, inscrivez-vous à la newsletter !",
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
    id: "spicy",
    label: "C'est très épicé ?",
    keywords: [
      "épicé",
      "epice",
      "epicé",
      "piment",
      "piquant",
      "fort",
      "doux",
      "spicy",
    ],
    answer:
      "Nos sauces sont parfumées mais jamais agressives. Si vous voulez plus doux ou au contraire bien relevé, précisez-le dans le champ « Note » de la réservation, on adapte avec plaisir.",
  },
  {
    id: "halal",
    label: "La viande est-elle halal ?",
    keywords: ["halal", "viande", "boeuf", "bœuf", "poulet", "agneau"],
    answer:
      "Oui, toutes nos viandes (poulet, bœuf, agneau) sont certifiées halal et issues de circuits courts à Lyon.",
  },
  {
    id: "portions",
    label: "Les portions sont-elles généreuses ?",
    keywords: [
      "portion",
      "quantité",
      "quantite",
      "rassasié",
      "rassasie",
      "faim",
      "gros",
      "petite",
      "taille",
    ],
    answer:
      "Oui, nos plats sont pensés comme un vrai repas complet : protéine, accompagnement, sauce. Si vous avez très faim, ajoutez un accompagnement supplémentaire au moment de commander.",
    cta: { label: "Voir le menu", href: "/menu" },
  },
  {
    id: "group",
    label: "Je commande pour un groupe",
    keywords: [
      "groupe",
      "famille",
      "amis",
      "plusieurs",
      "10 personnes",
      "20 personnes",
      "convives",
      "buffet",
      "traiteur",
    ],
    answer:
      "À partir de 6 personnes, on peut composer un menu sur mesure (entrée + plat + dessert) avec un tarif adapté. Écrivez-nous via la page contact en précisant la date, le nombre de convives et vos envies.",
    cta: { label: "Nous écrire", href: "/contact" },
  },
  {
    id: "events",
    label: "Vous faites des événements ?",
    keywords: [
      "événement",
      "evenement",
      "anniversaire",
      "mariage",
      "entreprise",
      "privatisation",
      "cocktail",
    ],
    answer:
      "Oui, on adore. Anniversaires, repas d'entreprise, événements privés, écrivez-nous via la page contact en précisant la date, le nombre de convives et vos envies.",
    cta: { label: "Nous écrire", href: "/contact" },
  },
  {
    id: "first-time",
    label: "Je découvre, vous me conseillez ?",
    keywords: [
      "conseil",
      "conseiller",
      "recommander",
      "recommandation",
      "première fois",
      "premiere fois",
      "découvre",
      "decouvre",
      "tester",
      "essayer",
      "best",
      "meilleur",
    ],
    answer:
      "Bienvenue ! Pour une première fois, on conseille le Poulet Yassa revisité (notre signature) ou le Mafé de bœuf onctueux. Pour les amateurs de poisson : le Saumon braisé sauce gingembre. Servi avec riz parfumé ou attiéké.",
    cta: { label: "Voir le menu", href: "/menu" },
  },
  {
    id: "newsletter",
    label: "Comment être tenu au courant ?",
    keywords: [
      "newsletter",
      "abonner",
      "tenir au courant",
      "nouvelles",
      "infos",
      "actualité",
      "actualite",
      "instagram",
      "facebook",
      "réseaux",
      "reseaux",
    ],
    answer:
      "Inscrivez-vous à notre newsletter en bas de page : vous recevrez les nouveautés, les ouvertures de créneaux et les offres réservées aux abonnés. Suivez-nous aussi sur Instagram @afro.miaam.",
  },
  {
    id: "freshness",
    label: "Vos produits sont frais ?",
    keywords: [
      "frais",
      "fraicheur",
      "fraîcheur",
      "qualité",
      "qualite",
      "origine",
      "produit",
      "circuit",
      "local",
      "marché",
      "marche",
    ],
    answer:
      "100 %. On cuisine à la commande, c'est pour ça qu'on demande 24h à l'avance. Les viandes et légumes viennent de circuits courts à Lyon, et les épices d'importateurs spécialisés en produits africains.",
  },
];

const DEFAULT_ANSWER =
  "Bonne question ! Je n'ai pas la réponse exacte ici. Le plus simple : laissez-nous votre numéro dans le chat, on vous rappelle. Ou écrivez-nous via la page contact, on revient vers vous très vite.";

const PHONE_REGEX = /(?:\+?\d[\s.\-]?){9,}/;

function extractPhone(input: string): string | null {
  const match = input.match(PHONE_REGEX);
  if (!match) return null;
  const digits = match[0].replace(/[^\d+]/g, "");
  const digitCount = digits.replace(/\D/g, "").length;
  if (digitCount < 9 || digitCount > 15) return null;
  return digits;
}

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
  const phone = extractPhone(input);
  if (phone) {
    return {
      answer: `Merci ! On a bien noté votre numéro (${phone}). Un membre de l'équipe Afro Miaam vous rappelle dans la journée (Lun à Sam, 10h à 19h). Si c'est urgent, vous pouvez aussi nous joindre au +33 (0)6 00 00 00 00.`,
      cta: { label: "Voir le menu en attendant", href: "/menu" },
    };
  }

  const topic = findTopic(input);
  if (!topic) return { answer: DEFAULT_ANSWER };
  return { answer: topic.answer, cta: topic.cta };
}
