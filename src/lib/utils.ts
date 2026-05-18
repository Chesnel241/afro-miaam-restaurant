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
    return "/img/desserts/lait-caille.png";
  }
  
  // Si l'image est vide ou semble être un placeholder d'erreur Firebase
  if (!item.image || item.image.includes("undefined")) {
     // Tentative de deviner le chemin local si dispo, sinon placeholder
     return "/img/menu/signature-1.png"; 
  }

  return item.image;
}

export function clientIp(request: Request): string {
  // Anti-spoofing: on Vercel, x-vercel-forwarded-for is reliable and injected by the edge
  const vercelIp = request.headers.get("x-vercel-forwarded-for");
  if (vercelIp) return vercelIp.split(",")[0].trim();
  
  // For standard proxies, if a user sends X-Forwarded-For, the proxy appends the true IP at the end
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) {
      const ips = fwd.split(",");
      return ips[ips.length - 1].trim(); 
  }
  return request.headers.get("x-real-ip") ?? "unknown";
}
