import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import InterestForm from "@/components/InterestForm";
import { seoFor } from "@/i18n/metadata";
import { rich } from "@/i18n/rich";
import { localePath, type Locale } from "@/i18n/routing";
import styles from "./page.module.css";

export async function generateMetadata({ params }: PageProps<"/[locale]/interest">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: "interest" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    ...(await seoFor(locale, "/interest")),
  };
}

/** Farmer & customer interest form: a page of its own so the link can be shared, e.g. /kn/interest on WhatsApp. */
export default async function InterestPage({ params }: PageProps<"/[locale]/interest">) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations("interest");

  return (
    <section className={`container ${styles.page}`}>
      <div>
        <a href={`${localePath(locale as Locale)}#contact`} className={styles.back}>
          <ArrowLeft size={16} aria-hidden="true" />
          {t("back")}
        </a>
        <p className="kicker">{t("kicker")}</p>
        <h1 className="title">{t.rich("title", rich)}</h1>
        <p className="lede">{t("intro")}</p>
        <p className={styles.note}>{t("privacy")}</p>
      </div>
      <InterestForm />
    </section>
  );
}
