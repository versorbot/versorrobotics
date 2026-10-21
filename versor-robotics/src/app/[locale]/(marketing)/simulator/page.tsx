import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import SprayLabLoader from "@/components/SprayLabLoader";
import { seoFor } from "@/i18n/metadata";
import { rich } from "@/i18n/rich";
import { localePath, type Locale } from "@/i18n/routing";
import { products } from "@/lib/site";
import styles from "./page.module.css";

const sprayer = products.find((p) => p.id === "spray")!;

export async function generateMetadata({ params }: PageProps<"/[locale]/simulator">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: "simulator" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    ...(await seoFor(locale, "/simulator")),
  };
}

export default async function SimulatorPage({ params }: PageProps<"/[locale]/simulator">) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations("simulator");

  return (
    <>
      <section className={`container ${styles.intro}`}>
        <a href={`${localePath(locale as Locale)}#products`} className={styles.back}>
          <ArrowLeft size={16} aria-hidden="true" />
          {t("back")}
        </a>
        <p className="kicker" lang="en">
          {sprayer.name} · {sprayer.code}
        </p>
        <h1 className="title">{t.rich("title", rich)}</h1>
        <p className="lede">{t("intro")}</p>
        <p className={styles.note}>{t("englishNote")}</p>
      </section>
      <SprayLabLoader />
    </>
  );
}
