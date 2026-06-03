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
  // Anti-spoofing: only trust forwarded-for headers when we know a trusted
  // proxy injected them. The trust model is configured via env vars:
  //   - TRUSTED_PROXY: "caddy" → read `x-forwarded-for` (Caddy default)
  //   - TRUSTED_PROXY: "vercel" → read `x-vercel-forwarded-for`
  //   - unset / other → no trust (collapse to a shared bucket)
  //
  // Critical: if we trusted `x-forwarded-for` unconditionally, an attacker
  // could mint a fresh rate-limit bucket per request by forging the header.
  // We only read it when explicitly told the deployment puts a trusted proxy
  // in front (Caddy in our self-hosted production stack). When the trusted
  // header is absent we collapse every such request into one shared bucket
  // ("untrusted-proxy") so they all throttle against the same counter.
  const trusted = process.env.TRUSTED_PROXY;

  if (trusted === "vercel") {
    const v = request.headers.get("x-vercel-forwarded-for");
    if (v) return v.split(",")[0].trim();
    return "untrusted-proxy";
  }

  if (trusted === "caddy") {
    // Caddy's reverse_proxy sets X-Forwarded-For with the original client IP
    // as the FIRST entry, and appends each hop. Take the leftmost.
    const xff = request.headers.get("x-forwarded-for");
    if (xff) return xff.split(",")[0].trim();
    // Fallback for direct Caddy → Next inside the same Docker network when
    // X-Forwarded-For somehow got stripped: X-Real-IP.
    const realIp = request.headers.get("x-real-ip");
    if (realIp) return realIp.trim();
    return "untrusted-proxy";
  }

  return "untrusted-proxy";
}
