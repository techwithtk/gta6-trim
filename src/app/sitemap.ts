import type { MetadataRoute } from "next";
import { GUIDES, SITE } from "@/lib/guides";

/** Public pages only — the dashboard and API stay out of search. */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: SITE, lastModified: now, changeFrequency: "weekly", priority: 1 },
    ...GUIDES.map((g) => ({ url: `${SITE}/${g.slug}`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.8 })),
    ...["terms", "privacy", "refunds"].map((p) => ({ url: `${SITE}/${p}`, lastModified: now, changeFrequency: "yearly" as const, priority: 0.2 })),
  ];
}
