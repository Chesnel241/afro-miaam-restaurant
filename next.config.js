/** @type {import('next').NextConfig} */

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
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
  output: "standalone",
  poweredByHeader: false,
  reactStrictMode: true,
  compress: true,
  // typescript.ignoreBuildErrors removed in pass 3: was masking real runtime
  // errors (ReferenceError on missing imports). Build now fails fast on type
  // errors. ESLint kept in ignoreDuringBuilds (mostly stylistic).
  eslint: { ignoreDuringBuilds: true },
  images: {
    // Self-hosted: menu images are served from /uploads/* (local volume via
    // Caddy in prod) and are same-origin, so no remotePattern is needed for
    // them. Unsplash kept for any remaining placeholder; Google avatar host
    // kept for OAuth profile pictures.
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
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

