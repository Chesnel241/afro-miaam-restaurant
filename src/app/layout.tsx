import type { Metadata, Viewport } from "next";
import { Poppins, Inter } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/components/CartContext";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Chatbot } from "@/components/Chatbot";
import { LoadingScreen } from "@/components/LoadingScreen";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { AppOverlay } from "@/components/AppOverlay";
import { CartRecovery } from "@/components/CartRecovery";
import { AuthProvider } from "@/components/AuthContext";
import { JsonLd } from "@/components/JsonLd";
import { restaurantJsonLd, SITE_URL } from "@/lib/seo";
import { BottomNavBar } from "@/components/BottomNavBar";
import { FloatingCart } from "@/components/FloatingCart";
import { Analytics } from "@vercel/analytics/next";

const display = Poppins({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
  variable: "--font-display",
  display: "swap",
});

const body = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Afro Miaam | Cuisine afro gastronomique à Lyon",
    template: "%s · Afro Miaam",
  },
  description:
    "Cuisine afro gastronomique à Lyon, en précommande 24h à l'avance. Commande en ligne, retrait sur place ou livraison à 3 € dans Lyon. Paiement après validation par téléphone.",
  metadataBase: new URL(SITE_URL),
  applicationName: "Afro Miaam",
  authors: [{ name: "Afro Miaam", url: SITE_URL }],
  creator: "Afro Miaam",
  publisher: "Afro Miaam",
  category: "food",
  keywords: [
    "restaurant africain Lyon",
    "commander africain Lyon",
    "cuisine africaine Lyon",
    "traiteur africain Lyon",
    "yassa Lyon",
    "tieboudienne Lyon",
    "mafé Lyon",
    "attiéké Lyon",
    "chef africain à domicile",
    "afro gastronomique",
    "Afro Miaam",
    "précommande restaurant Lyon",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "fr_FR",
    url: SITE_URL,
    siteName: "Afro Miaam",
    title: "Afro Miaam — Ça mijote, ça régale",
    description:
      "Cuisine afro gastronomique à Lyon. Précommande 24h à l'avance. Retrait à Lyon ou livraison à 3 €.",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Afro Miaam — Cuisine afro gastronomique à Lyon",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Afro Miaam — Ça mijote, ça régale",
    description:
      "Cuisine afro gastronomique à Lyon. Précommande 24h à l'avance.",
    images: ["/twitter-image"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  formatDetection: {
    telephone: true,
    address: true,
    email: true,
  },
  verification: {
    google: "WOpJu0AfW2PBWD5FJVa5oTE7Z10zcq37KFEke4IgE0g",
  },
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#1F3D2B",
  colorScheme: "light",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${display.variable} ${body.variable}`}>
      <body className="font-sans antialiased flex flex-col min-h-screen overflow-x-hidden">
        <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:rounded-md focus:bg-accent focus:px-4 focus:py-2 focus:text-white">
          Aller au contenu principal
        </a>
        <LoadingScreen />
        <AuthProvider>
          <AppOverlay />
          <CartProvider>
            <Header />
            <main id="main-content" role="main" className="flex-1 pb-28 lg:pb-0 animate-fade-in">{children}</main>
            <Footer />
            <BottomNavBar />
            <FloatingCart />
            <Chatbot />
            <WhatsAppButton />
            <CartRecovery />
          </CartProvider>
        </AuthProvider>
        <JsonLd data={restaurantJsonLd()} />
        <Analytics />
      </body>
    </html>
  );
}
