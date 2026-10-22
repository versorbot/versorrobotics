import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { site } from "@/lib/site";
import { localePath, routing, type Locale } from "./routing";

/** Every public page, as its English path. Used for the sitemap. */
export const pages = ["/", "/pilots", "/simulator", "/economics"] as const;

/** Absolute address of a page in a given language: ("hi", "/pilots") → "https://www.versorbots.com/hi/pilots". */
export function absoluteUrl(locale: Locale, path = "/"): string {
  return new URL(localePath(locale, path), site.url).href;
}

/** hreflang links for a page: every language version, plus x-default pointing at English. */
export function languagesFor(path = "/"): Record<string, string> {
  const languages: Record<string, string> = {};
  for (const l of routing.locales) languages[l] = absoluteUrl(l, path);
  languages["x-default"] = absoluteUrl(routing.defaultLocale, path);
  return languages;
}

/** Canonical + hreflang links for a page, all absolute on site.url. */
export function alternatesFor(locale: string, path = "/"): Metadata["alternates"] {
  const self = hasLocale(routing.locales, locale) ? locale : routing.defaultLocale;
  return { canonical: absoluteUrl(self, path), languages: languagesFor(path) };
}

/** The shared preview image (public/og.png). */
export const ogImage = { url: `${site.url}/og.png`, width: 1200, height: 630, alt: site.name };

/**
 * Canonical, hreflang and Open Graph for a page. Next.js replaces `openGraph` as a whole when a page sets it,
 * so this returns the full block (the site-wide title and description, plus this page's og:url).
 */
export async function seoFor(locale: string, path = "/"): Promise<Pick<Metadata, "alternates" | "openGraph">> {
  const self = hasLocale(routing.locales, locale) ? locale : routing.defaultLocale;
  const t = await getTranslations({ locale: self, namespace: "meta" });
  return {
    alternates: alternatesFor(self, path),
    openGraph: {
      title: site.name,
      description: t("ogDescription"),
      type: "website",
      locale: self,
      siteName: site.name,
      url: absoluteUrl(self, path),
      images: [ogImage],
    },
  };
}
