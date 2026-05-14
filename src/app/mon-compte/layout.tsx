import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mon compte",
  robots: { index: false, follow: false, nocache: true },
};

export default function MonCompteLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
