import type { MenuItem, MenuCategory } from "@/lib/types";

export const CATEGORY_LABELS: Record<MenuCategory, string> = {
  signature: "Nos signatures",
  plat: "Plats",
  accompagnement: "Accompagnements",
  sauce: "Sauces maison",
  dessert: "Desserts",
  boisson: "Boissons",
};

export const CATEGORY_ORDER: MenuCategory[] = [
  "signature",
  "plat",
  "accompagnement",
  "sauce",
  "dessert",
  "boisson",
];

// Photos Unsplash temporaires — à remplacer par les visuels officiels Afro Miaam.
export const menuItems: MenuItem[] = [
  {
    id: "poulet-yassa",
    category: "signature",
    name: "Poulet Yassa revisité",
    description:
      "Poulet mariné, oignons confits au citron, moutarde douce, riz parfumé.",
    price: 16,
    image:
      "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=900&q=80",
    tags: ["Le plus commandé"],
  },
  {
    id: "mafe-boeuf",
    category: "signature",
    name: "Mafé de bœuf onctueux",
    description: "Sauce arachide maison, viande fondante, riz blanc nacré.",
    price: 17,
    image:
      "https://images.unsplash.com/photo-1547928576-b822bc410bdf?auto=format&fit=crop&w=900&q=80",
    tags: ["Signature"],
  },
  {
    id: "saumon-braise",
    category: "signature",
    name: "Saumon braisé sauce gingembre",
    description: "Saumon braisé minute, sauce gingembre, alloco fondant.",
    price: 19,
    image:
      "https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&w=900&q=80",
    tags: ["À découvrir"],
  },

  {
    id: "poulet-braise",
    category: "plat",
    name: "Poulet braisé Afro Miaam",
    description: "Poulet entier mariné aux épices, braisé lentement, attiéké.",
    price: 15,
    image:
      "https://images.unsplash.com/photo-1598103442097-8b74394b95c6?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "thieboudienne",
    category: "plat",
    name: "Thieboudienne revisité",
    description: "Riz à la tomate, poisson farci, légumes mijotés du marché.",
    price: 18,
    image:
      "https://images.unsplash.com/photo-1604329760661-e71dc83f8f26?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "magret-piment-doux",
    category: "plat",
    name: "Magret sauce piment doux",
    description: "Magret rosé, sauce piment doux maison, purée de patate douce.",
    price: 20,
    image:
      "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "bowl-vege",
    category: "plat",
    name: "Bowl végétarien",
    description: "Légumes braisés, haricots noirs, plantain, sauce arachide.",
    price: 14,
    image:
      "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=900&q=80",
    tags: ["Végé"],
  },

  {
    id: "riz-parfume",
    category: "accompagnement",
    name: "Riz parfumé",
    description: "Riz long grain parfumé, beurre clarifié.",
    price: 4,
    image:
      "https://images.unsplash.com/photo-1516684732162-798a0062be99?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "alloco",
    category: "accompagnement",
    name: "Alloco",
    description: "Plantain doré, croustillant dehors, fondant dedans.",
    price: 5,
    image:
      "https://images.unsplash.com/photo-1601312378427-822b2b41da35?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "legumes-sautes",
    category: "accompagnement",
    name: "Légumes sautés",
    description: "Légumes du moment sautés au gingembre.",
    price: 4,
    image:
      "https://images.unsplash.com/photo-1543339308-43e59d6b73a6?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "frites-maison",
    category: "accompagnement",
    name: "Frites maison",
    description: "Pommes de terre fraîches, double cuisson, fleur de sel.",
    price: 4,
    image:
      "https://images.unsplash.com/photo-1576107232684-1279f390859f?auto=format&fit=crop&w=900&q=80",
  },

  {
    id: "sauce-piment-doux",
    category: "sauce",
    name: "Sauce piment doux",
    description: "Piments doux, ail rôti, jus de citron.",
    price: 1,
    image:
      "https://images.unsplash.com/photo-1599420186946-7b6fb4e297f0?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "sauce-arachide",
    category: "sauce",
    name: "Sauce arachide",
    description: "Pâte d'arachide rôtie, oignons, tomate, épices.",
    price: 1,
    image:
      "https://images.unsplash.com/photo-1612874742237-6526221588e3?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "sauce-gingembre",
    category: "sauce",
    name: "Sauce gingembre",
    description: "Gingembre frais, citron vert, miel d'acacia.",
    price: 1,
    image:
      "https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=900&q=80",
  },

  {
    id: "fondant-choco",
    category: "dessert",
    name: "Fondant chocolat cœur coulant",
    description: "Chocolat noir 70 %, cœur coulant tiède.",
    price: 6,
    image:
      "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "tiramisu-coco",
    category: "dessert",
    name: "Tiramisu coco",
    description: "Mascarpone au lait de coco, biscuit imbibé café-rhum.",
    price: 6,
    image:
      "https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "mousse-mangue",
    category: "dessert",
    name: "Mousse mangue exotique",
    description: "Mousse aérienne mangue, fruit de la passion, lime.",
    price: 6,
    image:
      "https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=900&q=80",
  },

  {
    id: "bissap",
    category: "boisson",
    name: "Bissap",
    description: "Infusion de fleurs d'hibiscus, menthe, sucre brun.",
    price: 3,
    image:
      "https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "gingembre-maison",
    category: "boisson",
    name: "Gingembre maison",
    description: "Jus de gingembre frais pressé, citron vert.",
    price: 3,
    image:
      "https://images.unsplash.com/photo-1622597467836-f3e6707e1191?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "citronnade",
    category: "boisson",
    name: "Citronnade",
    description: "Citron pressé, eau de source, sucre de canne, menthe.",
    price: 3,
    image:
      "https://images.unsplash.com/photo-1621263764928-df1444c5e859?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "soda",
    category: "boisson",
    name: "Soda",
    description: "Au choix : cola, orange, citron.",
    price: 2.5,
    image:
      "https://images.unsplash.com/photo-1581636625402-29b2a704ef13?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "eau",
    category: "boisson",
    name: "Eau minérale",
    description: "50 cl, plate ou pétillante.",
    price: 1.5,
    image:
      "https://images.unsplash.com/photo-1548839140-29a749e1cf4d?auto=format&fit=crop&w=900&q=80",
  },
];

export function itemsByCategory(category: MenuCategory): MenuItem[] {
  return menuItems.filter((i) => i.category === category);
}

export function findItem(id: string): MenuItem | undefined {
  return menuItems.find((i) => i.id === id);
}
