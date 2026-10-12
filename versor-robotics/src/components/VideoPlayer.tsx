"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import styles from "./VideoPlayer.module.css";
import { site } from "@/lib/site";

/**
 * Retro TV that plays your video.
 *  - YouTube id set in lib/site.ts  → embeds YouTube (privacy-friendly domain)
 *  - otherwise plays /public/videos/versor-demo.mp4
 *  - if the file is missing, shows a "reel coming soon" screen instead of a broken player
 */
export default function VideoPlayer() {
  const t = useTranslations("video");
  const { src, poster, youtubeId } = site.video;
  const [failed, setFailed] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // The browser can report a missing file before React has attached onError (server-rendered <video>),
  // so also look at the element's state once mounted.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const check = () => {
      if (v.error || v.networkState === HTMLMediaElement.NETWORK_NO_SOURCE) setFailed(true);
    };
    check();
    const t = window.setTimeout(check, 1500);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <div className={styles.tv} data-rover-avoid="">
      <div className={styles.screen}>
        {youtubeId ? (
          <iframe
            className={styles.media}
            src={`https://www.youtube-nocookie.com/embed/${youtubeId}?rel=0&modestbranding=1`}
            title={t("frameTitle")}
            loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        ) : !failed ? (
          <video
            ref={videoRef}
            className={styles.media}
            src={src}
            poster={poster || undefined}
            controls
            playsInline
            preload="metadata"
            onError={() => setFailed(true)}
          />
        ) : (
          <div className={styles.nosignal}>
            <p className={styles.nsTitle}>{t("soonTitle")}</p>
            <p className={styles.nsSub}>{t("soonText")}</p>
            <div className={styles.bars} aria-hidden="true">
              <i />
              <i />
              <i />
              <i />
              <i />
              <i />
              <i />
            </div>
          </div>
        )}
        <div className={styles.scan} aria-hidden="true" />
      </div>

      <div className={styles.base} aria-hidden="true">
        <span className={styles.rec}>
          <i /> {t("cam")}
        </span>
        <span className={styles.knobs}>
          <i />
          <i />
          <b />
        </span>
      </div>
    </div>
  );
}
