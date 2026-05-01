import type { Metadata } from "next";
import { Poppins, Inter } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/components/CartContext";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Chatbot } from "@/components/Chatbot";
import { LoadingScreen } from "@/components/LoadingScreen";

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
    "Cuisine afro gastronomique à Lyon, en précommande 24h à l'avance. Commande en ligne, retrait sur place ou livraison à 2 € dans Lyon. Paiement après validation par téléphone.",
  metadataBase: new URL("https://afro-miaam.fr"),
  openGraph: {
    title: "Afro Miaam, Ça mijote, ça régale",
    description:
      "Précommande 24h à l'avance. Retrait à Lyon ou livraison à 2 €.",
    type: "website",
    locale: "fr_FR",
  },
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${display.variable} ${body.variable}`}>
      <body className="font-sans antialiased">
        <LoadingScreen />
        <CartProvider>
          <Header />
          <main className="min-h-[60vh]">{children}</main>
          <Footer />
          <Chatbot />
        </CartProvider>
      </body>
    </html>
  );
}
