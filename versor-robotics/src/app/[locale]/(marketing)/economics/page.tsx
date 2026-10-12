import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import EconomicsCalcLoader from "@/components/EconomicsCalcLoader";
import { alternatesFor } from "@/i18n/metadata";
import { rich } from "@/i18n/rich";
import { localePath, type Locale } from "@/i18n/routing";
import { products } from "@/lib/site";
import styles from "./page.module.css";

const sprayer = products.find((p) => p.id === "spray")!;

export async function generateMetadata({ params }: PageProps<"/[locale]/economics">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: "economics" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: alternatesFor(locale, "/economics"),
  };
}

export default async function EconomicsPage({ params }: PageProps<"/[locale]/economics">) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations("economics");

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
      <EconomicsCalcLoader />
    </>
  );
}
