import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Confirmation de commande",
  robots: { index: false, follow: false, nocache: true },
};

export default function ConfirmationLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
