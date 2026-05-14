import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const routes: Array<{
    path: string;
    priority: number;
    changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  }> = [
    { path: "/", priority: 1.0, changeFrequency: "weekly" },
    { path: "/menu", priority: 0.9, changeFrequency: "weekly" },
    { path: "/prestations", priority: 0.8, changeFrequency: "monthly" },
    { path: "/reservation", priority: 0.7, changeFrequency: "monthly" },
    { path: "/comment-ca-marche", priority: 0.7, changeFrequency: "yearly" },
    { path: "/a-propos", priority: 0.6, changeFrequency: "yearly" },
    { path: "/contact", priority: 0.6, changeFrequency: "yearly" },
    { path: "/faq", priority: 0.6, changeFrequency: "monthly" },
    { path: "/cgv", priority: 0.3, changeFrequency: "yearly" },
    { path: "/confidentialite", priority: 0.3, changeFrequency: "yearly" },
    { path: "/mentions-legales", priority: 0.3, changeFrequency: "yearly" },
  ];

  return routes.map((r) => ({
    url: `${SITE_URL}${r.path}`,
    lastModified: now,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));
}
