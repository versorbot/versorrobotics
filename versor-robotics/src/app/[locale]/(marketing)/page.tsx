import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
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
import { contact, site } from "@/lib/site";

export async function generateMetadata({ params }: PageProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  return seoFor(locale);
}

/**
 * Who we are, for search engines: the site's name (schema.org WebSite, which Google shows above the result
 * instead of the domain) and the company behind it (Organization).
 */
const structuredData = {
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
      logo: `${site.url}/icon.svg`,
      email: contact.email.label,
    },
  ],
};

export default async function Home({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale as Locale); // the root layout has already 404ed anything else
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }}
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
