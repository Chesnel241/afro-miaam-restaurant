/** @type {import('next').NextConfig} */
const securityHeaders = [
  // Empêche le clickjacking
  { key: "X-Frame-Options", value: "DENY" },
  // Empêche le MIME sniffing
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Limite l'envoi du Referer
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Désactive APIs sensibles que ce site n'utilise pas
  {
    key: "Permissions-Policy",
    value:
      "camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=()",
  },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  // HSTS — uniquement utile en HTTPS, sans effet en local
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
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
