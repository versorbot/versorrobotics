import type { CSSProperties } from "react";
import type { Metadata } from "next";
import Image from "next/image";
import { ArrowLeft, Check } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import Reveal from "@/components/Reveal";
import { alternatesFor } from "@/i18n/metadata";
import { rich } from "@/i18n/rich";
import { localePath, type Locale } from "@/i18n/routing";
import styles from "./page.module.css";

/** Photos from the pilots (public/pilots), with their pixel sizes. Alt text and captions: messages → pilots.<section>.photos */
const photos = {
  hero: { src: "/pilots/robot-in-field.webp", w: 1280, h: 720 },
  load: { src: "/pilots/anekal-load-carrying.webp", w: 1280, h: 720 },
  chrysanthemum: { src: "/pilots/anekal-chrysanthemum.webp", w: 800, h: 1421 },
  trellisRow: { src: "/pilots/anekal-trellis-row.webp", w: 800, h: 1422 },
  dripRows: { src: "/pilots/drip-lines-rows.webp", w: 1178, h: 663 },
  dripCrossing: { src: "/pilots/drip-line-crossing.webp", w: 1178, h: 883 },
  flowerRows: { src: "/pilots/anekal-flower-rows.webp", w: 1178, h: 663 },
  workshop: { src: "/pilots/army-base-workshop.webp", w: 800, h: 1422 },
  armyLoad: { src: "/pilots/army-base-load-carrying.webp", w: 800, h: 1422 },
  crate: { src: "/pilots/crop-row-crate.webp", w: 800, h: 1422 },
  trellisCrate: { src: "/pilots/trellis-row-crate.webp", w: 1280, h: 721 },
} as const;

type Shot = { photo: (typeof photos)[keyof typeof photos]; alt: string; caption: string };

/** Where each photo's alt text and caption live, under pilots.* in the message files. */
type PhotoKey =
  | "hero"
  | `anekal.photos.${"load" | "trellis" | "chrysanthemum"}`
  | `lessons.photos.${"dripRows" | "dripCrossing" | "flowerRows"}`
  | `army.photos.${"workshop" | "load"}`
  | `row.photos.${"crate" | "trellis"}`;

/**
 * Photos side by side at one shared height (each takes width in proportion to its aspect ratio).
 * `width` is the row's widest size in CSS px, for the srcset; `stack` puts them one under another on phones.
 */
function PhotoRow({ shots, width, stack = false }: { shots: Shot[]; width: number; stack?: boolean }) {
  const total = shots.reduce((sum, s) => sum + s.photo.w / s.photo.h, 0);
  return (
    <Reveal className={`${styles.row} ${stack ? styles.stack : ""}`}>
      {shots.map(({ photo, alt, caption }) => {
        const share = photo.w / photo.h / total;
        const vw = Math.ceil(share * 100);
        const sizes = `${stack ? "(max-width: 640px) 100vw, " : ""}(max-width: 900px) ${vw}vw, ${Math.ceil(share * width)}px`;
        return (
          <figure key={photo.src} className={styles.photo} style={{ "--r": photo.w / photo.h } as CSSProperties}>
            <div className={styles.frame}>
              <Image
                src={photo.src}
                width={photo.w}
                height={photo.h}
                alt={alt}
                sizes={sizes}
                loading={photo === photos.hero ? "eager" : "lazy"}
              />
            </div>
            <figcaption>{caption}</figcaption>
          </figure>
        );
      })}
    </Reveal>
  );
}

export async function generateMetadata({ params }: PageProps<"/[locale]/pilots">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: "pilots" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: alternatesFor(locale, "/pilots"),
  };
}

export default async function PilotsPage({ params }: PageProps<"/[locale]/pilots">) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations("pilots");
  const home = localePath(locale as Locale);
  const shot = (photo: Shot["photo"], key: PhotoKey): Shot => ({ photo, alt: t(`${key}.alt`), caption: t(`${key}.caption`) });

  return (
    <>
      <section className={`container ${styles.split} ${styles.intro}`}>
        <div>
          <a href={`${home}#products`} className={styles.back}>
            <ArrowLeft size={16} aria-hidden="true" />
            {t("back")}
          </a>
          <p className="kicker">{t("kicker")}</p>
          <h1 className="title">{t.rich("title", rich)}</h1>
          <p className="lede">{t("intro")}</p>
        </div>
        <PhotoRow shots={[shot(photos.hero, "hero")]} width={680} />
      </section>

      <section className={styles.section} aria-labelledby="anekal">
        <div className={`container ${styles.split}`}>
          <div>
            <p className="kicker">{t("anekal.kicker")}</p>
            <h2 id="anekal" className={styles.h2} lang="en">
              {t("anekal.title")}
            </h2>
            <p className={styles.text}>{t("anekal.text")}</p>
            <dl className={styles.stats}>
              <div className={styles.stat}>
                <dt>{t("anekal.farms")}</dt>
                <dd>7</dd>
              </div>
              <div className={styles.stat}>
                <dt>{t("anekal.crops")}</dt>
                <dd>5</dd>
              </div>
            </dl>
            <p className={styles.crops}>{t("anekal.cropList")}</p>
            <p className={styles.listTitle}>{t("anekal.painTitle")}</p>
            <ul className={styles.list}>
              {(["1", "2", "3"] as const).map((n) => (
                <li key={n}>
                  <Check size={16} strokeWidth={3} aria-hidden="true" />
                  {t(`anekal.pain.${n}`)}
                </li>
              ))}
            </ul>
          </div>
          <div className={styles.media}>
            <PhotoRow shots={[shot(photos.load, "anekal.photos.load")]} width={680} />
            <PhotoRow
              shots={[shot(photos.chrysanthemum, "anekal.photos.chrysanthemum"), shot(photos.trellisRow, "anekal.photos.trellis")]}
              width={680}
            />
          </div>
        </div>
      </section>

      <section className={`${styles.section} ${styles.shade}`} aria-labelledby="lessons">
        <div className="container">
          <p className="kicker">{t("lessons.kicker")}</p>
          <h2 id="lessons" className={styles.h2}>
            {t("lessons.title")}
          </h2>
          <ul className={styles.cards}>
            {(["drip", "spacing", "turning"] as const).map((id, i) => (
              <li key={id}>
                <Reveal delay={i * 110} className={styles.cardWrap}>
                  <article className={styles.card}>
                    <h3>{t(`lessons.items.${id}.title`)}</h3>
                    <p>{t(`lessons.items.${id}.text`)}</p>
                  </article>
                </Reveal>
              </li>
            ))}
          </ul>
          <PhotoRow
            shots={[
              shot(photos.dripRows, "lessons.photos.dripRows"),
              shot(photos.dripCrossing, "lessons.photos.dripCrossing"),
              shot(photos.flowerRows, "lessons.photos.flowerRows"),
            ]}
            width={1180}
            stack
          />
        </div>
      </section>

      <section className={styles.section} aria-labelledby="army">
        <div className={`container ${styles.split}`}>
          <div>
            <p className="kicker">{t("army.kicker")}</p>
            <h2 id="army" className={styles.h2}>
              {t("army.title")}
            </h2>
            <p className={styles.text}>{t("army.text")}</p>
          </div>
          <PhotoRow
            shots={[shot(photos.workshop, "army.photos.workshop"), shot(photos.armyLoad, "army.photos.load")]}
            width={680}
          />
        </div>
      </section>

      <section className={styles.section} aria-labelledby="row">
        <div className="container">
          <p className="kicker">{t("row.kicker")}</p>
          <h2 id="row" className={styles.h2}>
            {t("row.title")}
          </h2>
          <p className={styles.text}>{t("row.text")}</p>
          <PhotoRow
            shots={[shot(photos.crate, "row.photos.crate"), shot(photos.trellisCrate, "row.photos.trellis")]}
            width={1180}
            stack
          />
          <p className={styles.cta}>
            <a href={`${home}#contact`} className="btn btn--amber">
              {t("cta")}
            </a>
          </p>
        </div>
      </section>
    </>
  );
}
