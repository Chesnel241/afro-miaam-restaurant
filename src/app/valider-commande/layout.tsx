import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Validation de commande",
  robots: { index: false, follow: false, nocache: true },
};

export default function ValiderCommandeLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
