export function formatPrice(value: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
  }).format(value);
}

export function classNames(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

/**
 * Retourne l'URL de l'image. Si l'URL Firebase est cassée ou si c'est un menu spécifique
 * ajouté localement (comme Lait caillé), on utilise le chemin local.
 */
export function getProductImage(item: { name: string, image: string }): string {
  // Cas spécifique demandé par l'utilisateur pour le Lait caillé
  if (item.name.toLowerCase().includes("lait caill") || item.name.toLowerCase().includes("lait caille")) {
    return "/img/desserts/Lait caillé.png";
  }
  
  // Si l'image est vide ou semble être un placeholder d'erreur Firebase
  if (!item.image || item.image.includes("undefined")) {
     // Tentative de deviner le chemin local si dispo, sinon placeholder
     return "/img/menu/signature-1.png"; 
  }

  return item.image;
}
