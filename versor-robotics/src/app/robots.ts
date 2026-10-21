import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

/** Served at /robots.txt. Preview deployments are kept out of search by the X-Robots-Tag header in next.config.mjs. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${site.url}/sitemap.xml`,
  };
}
