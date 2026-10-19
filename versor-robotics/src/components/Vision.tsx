import { Blocks, Leaf, Printer } from "lucide-react";
import { useTranslations } from "next-intl";
import Chapter from "./Chapter";
import Reveal from "./Reveal";
import { RoverBot } from "./illustrations/Bots";
import styles from "./Vision.module.css";
import { kicker, rich } from "@/i18n/rich";
import { C } from "@/lib/palette";

const values = [
  { id: "leaf", icon: Leaf },
  { id: "printer", icon: Printer },
  { id: "platform", icon: Blocks },
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
          {values.map(({ id, icon: Icon }, i) => (
            <li key={id}>
              <Reveal delay={i * 110} className={styles.cardWrap}>
                <article className={styles.card}>
                  <Icon size={26} strokeWidth={2.2} className={styles.icon} aria-hidden="true" />
                  <h3>{t(`values.${id}.title`)}</h3>
                  <p>{t(`values.${id}.text`)}</p>
                </article>
              </Reveal>
            </li>
          ))}
        </ul>
      </div>
    </Chapter>
  );
}
