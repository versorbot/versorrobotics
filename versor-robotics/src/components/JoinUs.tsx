import { ArrowUpRight } from "lucide-react";
import { useTranslations } from "next-intl";
import Chapter from "./Chapter";
import { SproutIcon } from "./illustrations/Bots";
import styles from "./JoinUs.module.css";
import { kicker, rich } from "@/i18n/rich";
import { C } from "@/lib/palette";
import { contact, roles } from "@/lib/site";

export default function JoinUs() {
  const t = useTranslations("join");
  const tn = useTranslations("nav");

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
              <a href="#roles" className="btn btn--sprout">
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

        <div id="roles" className={styles.roles}>
          <div className={styles.rolesHead}>
            <span>{t("openRoles")}</span>
            <span>{t("teamType")}</span>
          </div>
          <ul>
            {roles.map(({ id, form }) => (
              <li key={id}>
                <a href={form} target="_blank" rel="noopener noreferrer">
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
      </div>
    </Chapter>
  );
}
