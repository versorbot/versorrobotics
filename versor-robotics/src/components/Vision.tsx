import { Blocks, Package, Printer } from "lucide-react";
import { useTranslations } from "next-intl";
import Chapter from "./Chapter";
import Reveal from "./Reveal";
import { RoverBot } from "./illustrations/Bots";
import styles from "./Vision.module.css";
import { kicker, rich } from "@/i18n/rich";
import { C } from "@/lib/palette";
import { products } from "@/lib/site";

const productName = (id: (typeof products)[number]["id"]) => products.find((p) => p.id === id)!.name;

/** The platform, then one card per product. Product names come from site.ts, like in the Products section. */
const values = [
  { id: "platform", icon: Blocks, name: null },
  { id: "carrier", icon: Package, name: productName("carrier") },
  { id: "spray", icon: Printer, name: productName("spray") },
] as const;

export default function Vision() {
  const t = useTranslations("vision");
  const tn = useTranslations("nav");
  return (
    <Chapter id="vision" label={tn("vision")} prev={C.ink} bg={C.tomato} dot="rgba(0,0,0,0.08)">
      <div className={styles.rays} aria-hidden="true" />
      <div className={`container ${styles.wrap}`}>
        <div className={styles.head}>
          <div>
            <p className="kicker" style={{ color: C.cream }}>
              {kicker(1, tn("vision"))}
            </p>
            <h2 className="title">
              {t.rich("title", { ...rich, ink: (c) => <span className={styles.ink}>{c}</span> })}
            </h2>
            <p className={`lede ${styles.lede}`}>
              {t("lede")}
            </p>
          </div>

          <figure className={styles.unit}>
            <RoverBot className={styles.unitBot} title={t("unitAlt")} />
            <figcaption>{t("unitCaption")}</figcaption>
          </figure>
        </div>

        <ul className={styles.values}>
          {values.map(({ id, icon: Icon, name }, i) => (
            <li key={id}>
              <Reveal delay={i * 110} className={styles.cardWrap}>
                <article className={styles.card}>
                  <Icon size={26} strokeWidth={2.2} className={styles.icon} aria-hidden="true" />
                  {name ? <h3 lang="en">{name}</h3> : <h3>{t("values.platform.title")}</h3>}
                  <p>{t(`values.${id}.text`)}</p>
                </article>
              </Reveal>
            </li>
          ))}
        </ul>

        <p className={`lede ${styles.lede} ${styles.closing}`}>{t("closing")}</p>
      </div>
    </Chapter>
  );
}
