import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mon panier",
  robots: { index: false, follow: false, nocache: true },
};

export default function PanierLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
