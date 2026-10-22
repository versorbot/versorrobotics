import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import Hero from "@/components/Hero";
import Vision from "@/components/Vision";
import VideoSection from "@/components/VideoSection";
import Products from "@/components/Products";
import Features from "@/components/Features";
import Contact from "@/components/Contact";
import JoinUs from "@/components/JoinUs";
import Game from "@/components/Game";
import { seoFor } from "@/i18n/metadata";
import { contact, presence, site } from "@/lib/site";

export async function generateMetadata({ params }: PageProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  return seoFor(locale);
}

/**
 * Who we are, for search engines: the site's name (schema.org WebSite, which Google shows above the result
 * instead of the domain) and the company behind it (Organization). Edit the details in site.ts → presence.
 */
function structuredData(description: string) {
  const { address } = presence;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        name: site.name,
        alternateName: "Versor",
        url: `${site.url}/`,
      },
      {
        "@type": "Organization",
        name: site.name,
        url: site.url,
        logo: `${site.url}${presence.logo}`,
        description,
        email: contact.email.label,
        telephone: contact.phone.label,
        address: {
          "@type": "PostalAddress",
          streetAddress: address.street,
          addressLocality: address.locality,
          addressRegion: address.region,
          addressCountry: address.country,
        },
        hasMap: contact.location.href,
        sameAs: presence.profiles,
        subjectOf: presence.coverage.map((c) => ({ "@type": "CreativeWork", name: c.name, url: c.url })),
      },
    ],
  };
}

export default async function Home({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale as Locale); // the root layout has already 404ed anything else
  const t = await getTranslations("meta");
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData(t("description"))).replace(/</g, "\\u003c") }}
      />
      <Hero />
      <Vision />
      <VideoSection />
      <Products />
      <Features />
      <Contact />
      <JoinUs />
      <Game />
    </>
  );
}
