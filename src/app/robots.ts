import type { MetadataRoute } from "next";
import { SITE } from "@/lib/guides";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/dashboard", "/api/"] },
    sitemap: `${SITE}/sitemap.xml`,
  };
}
