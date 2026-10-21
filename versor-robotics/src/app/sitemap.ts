import type { MetadataRoute } from "next";
import { absoluteUrl, languagesFor, pages } from "@/i18n/metadata";
import { routing } from "@/i18n/routing";

/** Every page in every language, each listing all of its language versions. Served at /sitemap.xml. */
export default function sitemap(): MetadataRoute.Sitemap {
  return pages.flatMap((path) =>
    routing.locales.map((locale) => ({
      url: absoluteUrl(locale, path),
      alternates: { languages: languagesFor(path) },
    })),
  );
}
