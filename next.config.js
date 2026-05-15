/** @type {import('next').NextConfig} */

// H-1 (pass 5): Content-Security-Policy.
// The JsonLd.tsx component uses dangerouslySetInnerHTML for ld+json scripts.
// Content is escape-encoded (< → <) so it can't break out of the
// script tag, but a strict CSP without 'unsafe-inline' would still block it.
// Two pragmatic choices:
//   (a) Keep 'unsafe-inline' for scripts — weaker against future XSS sinks
//       but works without refactor.
//   (b) Nonce strategy — middleware injects per-request nonce. Heavier.
// We take (a) for now. frame-ancestors, base-uri, form-action, object-src
// remain meaningfully tightened against most attack classes.
const CSP_DIRECTIVES = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://www.google.com/recaptcha/ https://www.gstatic.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob: https://images.unsplash.com https://firebasestorage.googleapis.com https://lh3.googleusercontent.com",
  "connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://firebase.googleapis.com https://firebaseappcheck.googleapis.com https://firestore.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com wss://*.firebaseio.com",
  "frame-src https://www.google.com/recaptcha/",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  // CSP frame-ancestors couvre déjà ça mais on garde par défense en profondeur.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // H-1 (pass 5)
  { key: "Content-Security-Policy", value: CSP_DIRECTIVES },
  // M-4 (pass 5): Cross-Origin-Opener-Policy — isolation des popups.
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  // camera=(self) requis pour le QR scanner admin (validation à la livraison).
  {
    key: "Permissions-Policy",
    value:
      "camera=(self), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=()",
  },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  // typescript.ignoreBuildErrors removed in pass 3: was masking real runtime
  // errors (ReferenceError on missing imports). Build now fails fast on type
  // errors. ESLint kept in ignoreDuringBuilds (mostly stylistic).
  eslint: { ignoreDuringBuilds: true },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "firebasestorage.googleapis.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

module.exports = nextConfig;
