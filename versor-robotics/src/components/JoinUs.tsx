import { ArrowUpRight } from "lucide-react";
import { useTranslations } from "next-intl";
import Chapter from "./Chapter";
import { SproutIcon } from "./illustrations/Bots";
import styles from "./JoinUs.module.css";
import { kicker, rich } from "@/i18n/rich";
import { C } from "@/lib/palette";
import { contact, roles, site } from "@/lib/site";

export default function JoinUs() {
  const t = useTranslations("join");
  const tn = useTranslations("nav");
  const { url, embedUrl } = site.forms.join;
  // Until a Google Form link is set, applications fall back to email.
  const apply = url || `${contact.email.href}?subject=${encodeURIComponent(t("applySubject"))}`;
  const external = Boolean(url);

  return (
    <Chapter id="join" label={tn("join")} prev={C.deep} bg={C.ink}>
      <div className="container">
        <div className={styles.head}>
          <div>
            <p className="kicker">{kicker(6, tn("join"))}</p>
            <h2 className="title">{t.rich("title", rich)}</h2>
            <p className="lede">
              {t("lede")}
            </p>
            <div className={styles.ctas}>
              <a href={apply} className="btn btn--sprout" {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
                {t("apply")}
              </a>
              <a href={contact.email.href} className="btn btn--ghost">
                {t("hello")}
              </a>
            </div>
          </div>

          <div className={styles.badge} aria-hidden="true">
            <SproutIcon className={styles.sprout} />
          </div>
        </div>

        <div className={styles.roles}>
          <div className={styles.rolesHead}>
            <span>{t("openRoles")}</span>
            <span>{t("teamLocation")}</span>
          </div>
          <ul>
            {roles.map((id) => (
              <li key={id}>
                <a href={apply} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
                  <strong>{t(`roles.${id}.title`)}</strong>
                  <span className={styles.tags}>
                    <em>{t(`roles.${id}.team`)}</em>
                    <em className={styles.where}>{t(`roles.${id}.where`)}</em>
                    <ArrowUpRight size={18} aria-hidden="true" />
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </div>

        {embedUrl ? (
          <div className={styles.embed}>
            <iframe src={embedUrl} title={t("formTitle")} loading="lazy" />
          </div>
        ) : null}
      </div>
    </Chapter>
  );
}
