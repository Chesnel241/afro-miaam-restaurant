import type { MenuItem, MenuCategory } from "@/lib/types";

export const CATEGORY_LABELS: Record<MenuCategory, string> = {
  signature: "Nos signatures",
  plat: "Plats",
  entree: "Entrées",
  accompagnement: "Accompagnements",
  sauce: "Sauces maison",
  dessert: "Desserts",
  gourmandise: "+ de Gourmandises",
  boisson: "Boissons",
};

export const CATEGORY_ORDER: MenuCategory[] = [
  "signature",
  "plat",
  "entree",
  "accompagnement",
  "sauce",
  "dessert",
  "gourmandise",
  "boisson",
];

export const menuItems: MenuItem[] = [
  // Plats (dossier public/menu)
  {
    id: "garba",
    category: "plat",
    name: "Garba",
    description: "Plat traditionnel ivoirien avec attiéké et thon.",
    price: 13,
    image: "/menu/Garba.png",
    tags: ["Populaire"],
  },
  {
    id: "tiep-poulet",
    category: "plat",
    name: "Tièp poulet",
    description: "Riz au gras sénégalais avec poulet et légumes.",
    price: 14,
    image: "/menu/Tièp poulet.png",
  },
  {
    id: "mafe-poulet",
    category: "plat",
    name: "Mafé poulet",
    description: "Poulet mijoté dans une sauce onctueuse à la pâte d'arachide.",
    price: 13,
    image: "/menu/Mafé poulet.png",
  },
  {
    id: "tiep-poisson",
    category: "signature",
    name: "Tièp poisson",
    description: "Riz au gras avec poisson, plat emblématique d'Afrique de l'Ouest.",
    price: 15,
    image: "/menu/Tièp poisson.png",
  },
  {
    id: "odika-poulet",
    category: "plat",
    name: "Odika poulet",
    description: "Poulet au chocolat indigène (sauce odika) du Gabon.",
    price: 19.90,
    image: "/menu/Odika poulet.png",
  },
  {
    id: "poulet-mayo",
    category: "plat",
    name: "Poulet mayo",
    description: "Poulet braisé avec sa sauce mayonnaise maison.",
    price: 14,
    image: "/menu/Poulet mayo.png",
  },
  {
    id: "haricot-beignets",
    category: "plat",
    name: "Haricot beignets",
    description: "Haricots rouges mijotés servis avec beignets croustillants.",
    price: 12,
    image: "/menu/Haricot beignets.png",
  },
  {
    id: "poulet-yassa",
    category: "plat",
    name: "Poulet yassa",
    description: "Poulet mariné au citron et oignons confits.",
    price: 14,
    image: "/menu/Poulet yassa.png",
  },
  {
    id: "mafe-boeuf",
    category: "signature",
    name: "Mafé boeuf",
    description: "Bœuf fondant dans une sauce onctueuse à l'arachide.",
    price: 14,
    image: "/menu/Mafé boeuf.png",
    tags: ["Le plus commandé"],
  },
  {
    id: "poisson-sale",
    category: "signature",
    name: "Poisson salé",
    description: "Poisson salé mijoté aux légumes.",
    price: 16.90,
    image: "/menu/Poisson salé.png",
  },
  {
    id: "feuilles-manioc",
    category: "plat",
    name: "Feuilles de manioc",
    description: "Feuilles de manioc pilées et mijotées.",
    price: 13,
    image: "/menu/Feuilles de manioc.png",
  },

  // Entrées (dossier public/Entrées)
  {
    id: "samoussa-boeuf",
    category: "entree",
    name: "Samoussa boeuf",
    description: "Triangles croustillants garnis de viande de boeuf hachée et épicée.",
    price: 5,
    image: "/Entrées/Samoussa boeuf.png",
  },
  {
    id: "pastels",
    category: "entree",
    name: "Pastels",
    description: "Beignets farcis accompagnés d'une sauce relevée.",
    price: 5,
    image: "/Entrées/Pastels.png",
  },
  {
    id: "samoussa-thon",
    category: "entree",
    name: "Samoussa thon",
    description: "Triangles croustillants garnis de thon.",
    price: 5,
    image: "/Entrées/Samoussa thon.png",
  },

  // Accompagnements (dossier public/Accompagnements)
  {
    id: "frites-patates-douces",
    category: "accompagnement",
    name: "Frites de patates douces",
    description: "Frites de patates douces croustillantes.",
    price: 4.5,
    image: "/Accompagnements/Frites de patates douces.png",
  },
  {
    id: "banane-bouillie",
    category: "accompagnement",
    name: "Banane bouillie",
    description: "Banane plantain bouillie nature.",
    price: 4,
    image: "/Accompagnements/Banane bouilliepng.png",
  },
  {
    id: "riz",
    category: "accompagnement",
    name: "Riz",
    description: "Portion de riz parfumé.",
    price: 3.5,
    image: "/Accompagnements/Riz.png",
  },
  {
    id: "attieke",
    category: "accompagnement",
    name: "Attiéké",
    description: "Semoule de manioc cuite à la vapeur.",
    price: 3,
    image: "/Accompagnements/Attiéké.png",
  },
  {
    id: "beignets",
    category: "accompagnement",
    name: "Beignets",
    description: "Frites de bananes plantain.",
    price: 4,
    image: "/Accompagnements/Beignets.png",
  },
  {
    id: "frites",
    category: "accompagnement",
    name: "Frites",
    description: "Frites classiques de pomme de terre.",
    price: 3.5,
    image: "/Accompagnements/Frites.png",
  },
  {
    id: "manioc",
    category: "accompagnement",
    name: "Manioc",
    description: "Tubercule de manioc bouilli.",
    price: 3.5,
    image: "/Accompagnements/Manioc.png",
  },

  // Desserts (dossier public/Désserts)
  {
    id: "pancakes",
    category: "dessert",
    name: "Pancakes",
    description: "Pancakes moelleux et sirop.",
    price: 6,
    image: "/Désserts/Pancakes.png",
  },
  {
    id: "tiramisu",
    category: "dessert",
    name: "Tiramisu",
    description: "Tiramisu onctueux revisité.",
    price: 6.5,
    image: "/Désserts/Tiramisu.png",
  },
  {
    id: "degue",
    category: "dessert",
    name: "Dégué",
    description: "Dessert rafraîchissant au yaourt et grains de mil.",
    price: 4,
    image: "/Désserts/Dégué.png",
  },
  {
    id: "crepes",
    category: "dessert",
    name: "Crêpes",
    description: "Crêpes fondantes et gourmandes.",
    price: 5,
    image: "/Désserts/Crêpes.png",
  },
  {
    id: "fondant-chocolat",
    category: "dessert",
    name: "Fondant chocolat",
    description: "Gâteau au coeur coulant de chocolat.",
    price: 5,
    image: "/Désserts/Fondant chocolat.png",
  },

  // + de Gourmandises (dossier public/+ de Gourmandises)
  {
    id: "gateau-banane",
    category: "gourmandise",
    name: "Gâteau banane",
    description: "Cake moelleux à la banane.",
    price: 4,
    image: "/+ de Gourmandises/Gâteau banane.png",
  },
  {
    id: "gateau-farine",
    category: "gourmandise",
    name: "Gâteau farine",
    description: "Douceur locale à découvrir.",
    price: 4,
    image: "/+ de Gourmandises/Gâteau farine.png",
  },

  // Boissons (dossier public/Boissons)
  {
    id: "boisson-detox",
    category: "boisson",
    name: "Boisson détox",
    description: "Mélange frais et sain pour se revitaliser.",
    price: 5.50,
    image: "/Boissons/Boisson détox.png",
  },
  {
    id: "bissap",
    category: "boisson",
    name: "Bissap",
    description: "Infusion de fleurs d'hibiscus.",
    price: 3.5,
    image: "/Boissons/Bissap.png",
  },
  {
    id: "jus-orange-presse",
    category: "boisson",
    name: "Jus orange pressé",
    description: "Oranges fraîchement pressées.",
    price: 3.50,
    image: "/Boissons/Jus orange pressé.png",
  },
  {
    id: "eau",
    category: "boisson",
    name: "Eau",
    description: "Bouteille d'eau plate.",
    price: 2,
    image: "/Boissons/Eau.png",
  },
  {
    id: "jus-gingembre",
    category: "boisson",
    name: "Jus de Gingembre",
    description: "Boisson tonifiante au gingembre et citron.",
    price: 3.5,
    image: "/Boissons/Jus de Gingembre.png",
  },
];

export function itemsByCategory(category: MenuCategory): MenuItem[] {
  return menuItems.filter((i) => i.category === category);
}

export function findItem(id: string): MenuItem | undefined {
  return menuItems.find((i) => i.id === id);
}
