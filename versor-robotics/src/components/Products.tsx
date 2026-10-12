import { ArrowRight, Check } from "lucide-react";
import { useTranslations } from "next-intl";
import Chapter from "./Chapter";
import Reveal from "./Reveal";
import { CarrierBot, SprayerBot } from "./illustrations/Bots";
import styles from "./Products.module.css";
import { Link } from "@/i18n/navigation";
import { kicker, rich } from "@/i18n/rich";
import { C } from "@/lib/palette";
import { products } from "@/lib/site";

const art = {
  carrier: { Bot: CarrierBot, screen: C.sproutDark },
  spray: { Bot: SprayerBot, screen: "#3b6676" },
} as const;

const POINTS = ["1", "2", "3"] as const;

export default function Products() {
  const t = useTranslations("products");
  const tn = useTranslations("nav");
  return (
    <Chapter id="products" label={tn("products")} prev={C.deep} bg={C.ink}>
      <div className="container">
        <p className="kicker">{kicker(3, tn("products"))}</p>
        <h2 className="title">{t.rich("title", rich)}</h2>
        <p className="lede">{t("lede")}</p>

        <div className={styles.grid}>
          {products.map((p, i) => {
            const { Bot, screen } = art[p.id];
            const kind = t(`items.${p.id}.kind`);
            return (
              <Reveal key={p.id} delay={i * 140}>
                <article className={`${styles.card} rv-hover`}>
                  <div className={styles.cab}>
                    <div className={styles.plate} lang="en">{p.code}</div>
                    <div className={styles.screen} style={{ background: screen }}>
                      <div className={styles.rows} aria-hidden="true" />
                      <Bot className={styles.bot} title={kind} />
                      <div className={styles.scan} aria-hidden="true" />
                    </div>
                    <div className={styles.ctrl} aria-hidden="true">
                      <i className={styles.red} />
                      <i className={styles.yellow} />
                      <b />
                    </div>
                  </div>

                  <div className={styles.meta}>
                    <p className={styles.sub}>
                      {p.index} / {kind}
                    </p>
                    <h3 lang="en">{p.name}</h3>
                    <p className={styles.tagline}>{t(`items.${p.id}.tagline`)}</p>
                    <ul>
                      {POINTS.map((n) => (
                        <li key={n}>
                          <Check size={16} strokeWidth={3} aria-hidden="true" />
                          {t(`items.${p.id}.points.${n}`)}
                        </li>
                      ))}
                    </ul>
                    <div className={styles.actions}>
                      <a href="#contact" className="btn btn--amber">
                        {t("cta")}
                      </a>
                      {p.id === "spray" ? (
                        <>
                          <Link href="/simulator" className={styles.simLink}>
                            {t("simulator")}
                            <ArrowRight size={16} aria-hidden="true" />
                          </Link>
                          <Link href="/economics" className={styles.simLink}>
                            {t("economics")}
                            <ArrowRight size={16} aria-hidden="true" />
                          </Link>
                        </>
                      ) : null}
                    </div>
                  </div>
                </article>
              </Reveal>
            );
          })}
        </div>
      </div>
    </Chapter>
  );
}
