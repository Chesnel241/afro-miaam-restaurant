const SCRIPT_SRC_HOSTS = [
  "'self'",
  // Nonces let us drop 'unsafe-inline' for our inline JSON-LD scripts while
  // keeping Next's runtime scripts compatible. Only reCAPTCHA v3 remains as an
  // external script host (self-hosted backend — no Firebase).
  "https://www.google.com/recaptcha/",
  "https://www.gstatic.com",
];

export const NONCE_HEADER = "x-nonce";

function buildBaseDirectives(nonce: string) {
  return [
    "default-src 'self'",
    `script-src ${SCRIPT_SRC_HOSTS.join(" ")} 'nonce-${nonce}'`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' data: https://fonts.gstatic.com",
    "img-src 'self' data: blob: https://images.unsplash.com https://lh3.googleusercontent.com",
    "connect-src 'self' https://www.google.com/recaptcha/",
    "frame-src https://www.google.com/recaptcha/",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    "upgrade-insecure-requests",
  ];
}

export function createCspNonce() {
  return crypto.randomUUID().replace(/-/g, "");
}

export function buildContentSecurityPolicy(nonce: string) {
  return buildBaseDirectives(nonce).join("; ");
}
