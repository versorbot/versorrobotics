import { useLocale, useTranslations } from "next-intl";
import styles from "./Footer.module.css";
import { RoverBot } from "./illustrations/Bots";
import { Link } from "@/i18n/navigation";
import { localePath, type Locale } from "@/i18n/routing";
import { nav, site } from "@/lib/site";

export default function Footer() {
  const t = useTranslations("footer");
  const tn = useTranslations("nav");
  const home = localePath(useLocale() as Locale);
  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.inner}`}>
        <a href={`${home}#top`} className={styles.brand} aria-label={t("top")}>
          <RoverBot className={styles.bot} />
          <span lang="en">{site.name}</span>
        </a>
        <nav aria-label={t("nav")} className={styles.links}>
          {nav.map((id) => (
            <a key={id} href={`${home}#${id}`}>
              {tn(id)}
            </a>
          ))}
          <Link href="/pilots">{t("pilots")}</Link>
          <Link href="/simulator">{t("simulator")}</Link>
          <Link href="/economics">{t("economics")}</Link>
        </nav>
        <p className={styles.copy}>
          &copy; {new Date().getFullYear()} <span lang="en">{site.name}</span>. {t("tagline")}
        </p>
      </div>
    </footer>
  );
}
