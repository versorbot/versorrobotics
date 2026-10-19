"use client";

import "@fontsource/lato/400.css";
import "@fontsource/lato/400-italic.css";
import "@fontsource/lato/700.css";
import "@fontsource/lato/900.css";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import { useEffect, useRef } from "react";
import styles from "./SprayLab.module.css";
import { mountSprayLab } from "@/lib/sprayLab";

/**
 * AGV spray rig simulator for the pesticide printer (engine: lib/sprayLab.ts, a 1:1 port of reference/agv-spray-sim.html).
 * Its own labels stay in English on every language. Loaded client-only from SprayLabLoader.
 */
export default function SprayLab() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    return mountSprayLab(root, styles);
  }, []);

  return (
    <div ref={ref} className={styles.lab} lang="en" data-rover-avoid="">
      <div className={styles.wrap}>
        <header className={styles.top}>
          <div>
            <h2>AGV Spray Rig Simulator</h2>
            <p>Selective spot sprayer · vertical mast M-101 · LS 20 tips on PWM valves · all views drawn to scale</p>
          </div>
          <div className={styles.transport}>
            <button className={`${styles.btn} ${styles.primary}`} data-ref="play" type="button">
              Pause
            </button>
            <label className={styles.playback}>
              Playback
              <input type="range" data-ref="timeScale" min="0.05" max="1" step="0.05" defaultValue="0.25" />
              <output data-ref="timeScaleOut">0.25×</output>
            </label>
            <button className={styles.btn} data-ref="reset" type="button">
              Reset to drawing values
            </button>
          </div>
        </header>

        <div className={styles.layout}>
          <section className={styles.views} data-ref="views" aria-label="Simulation views">
            <figure className={styles.view}>
              <canvas
                className={styles.rear}
                data-ref="rear"
                aria-label="Rear view of the AGV, mast, spray fans and crop row. Click a nozzle or drag a box over several to switch them off or on."
              />
              <div className={styles.nozbar}>
                <span className={styles.hint}>
                  Click a nozzle or its fan to switch it off or on, drag a box over several, or use the buttons below.
                </span>
                <span className={styles.off} data-ref="offList" />
                <button className={styles.btn} data-ref="allOn" type="button">
                  All nozzles on
                </button>
                <div className={styles.chips} data-ref="nozChips" role="group" aria-label="Nozzles N1 to top; pressed means switched on" />
              </div>
              <div className={styles.live} data-ref="liveRear" />
            </figure>
            <figure className={styles.view}>
              <canvas data-ref="plan" aria-label="Plan view of the AGV, camera field of view, plants and spray windows" />
              <div className={styles.live} data-ref="livePlan" />
            </figure>
            <figure className={`${styles.view} ${styles.wide}`}>
              <canvas data-ref="pump" aria-label="Pump curve against nozzle demand" />
              <div className={styles.live} data-ref="livePump" />
            </figure>
          </section>

          <aside className={styles.controls} data-ref="controls" aria-label="Design variables" />

          <section className={styles.results} aria-label="Checks">
            <div className={styles.summary} data-ref="summary" />
            <div className={styles["res-grid"]} data-ref="resGrid" />
            <div className={styles.foot}>
              <p>
                Nozzle flow uses the Lechler LS 20 table (Q = k·√p; 005: 0.16–0.26 L/min, 02: 0.64–1.02 L/min at 2–5 bar). Filter
                guidance comes from the Lechler flyer (80 M for 005, 60 M for 02) and the WEED-IT manual (at least a 100 mesh pressure
                filter, 3.0 bar working pressure).
              </p>
              <p>
                Assumed models: pump curve is a straight line from free-flow to shut-off; pump efficiency 35 % on 12 V; mesh opening ≈
                15 200 / mesh µm; orifice size from Cd = 0.8; valve frequency and response limits are placeholders until you have the
                Hayes/WEED-IT valve datasheet. Spray fan width is the geometric width 2·d·tan(θ/2).
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
