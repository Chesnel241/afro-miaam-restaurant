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
  // Anti-spoofing: this app deploys on Vercel (see vercel.json), where
  // `x-vercel-forwarded-for` is injected by the trusted edge and reflects the
  // real client IP. It cannot be forged by the client.
  //
  // We deliberately do NOT fall back to `x-forwarded-for` or `x-real-ip`:
  // both are fully client-supplied when a request does not pass through the
  // Vercel edge, so trusting them would let an attacker mint a brand-new
  // rate-limit bucket on every request by rotating a forged IP, completely
  // defeating the limiter (pentest finding H-1). When the trusted header is
  // absent we collapse every such request into one shared bucket
  // ("untrusted-proxy") so they all throttle against the same counter rather
  // than each getting unlimited per-spoofed-IP budgets.
  const vercelIp = request.headers.get("x-vercel-forwarded-for");
  if (vercelIp) return vercelIp.split(",")[0].trim();

  return "untrusted-proxy";
}
