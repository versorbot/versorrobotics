"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import styles from "./Chapter.module.css";
import { readViewport, rowPx, ScrollDirection, washPolygon, washProgress, type Viewport } from "@/lib/wash";
import { WaterFx } from "@/lib/waterFx";

type Props = {
  /** anchor id used by the nav (#vision, #products …) */
  id: string;
  /** accessible name of the section (its nav label) */
  label: string;
  /** background colour of the previous section: what the spray washes away */
  prev: string;
  /** this section's background colour */
  bg: string;
  /** text colour inside the section */
  fg?: string;
  /** colour of the dot texture */
  dot?: string;
  children: ReactNode;
};

/** What the shared driver needs from each mounted chapter. */
type Wash = {
  /** re-read sizes and page offset (layout reads; only on load and resize, never while scrolling) */
  measure(vp: Viewport): void;
  /** update for scroll position y and direction blend s; true while it still wants frames */
  frame(y: number, s: number, dt: number): boolean;
};

/**
 * One scroll listener, one requestAnimationFrame loop and one direction tracker for every chapter on the page.
 * The scroll handler only schedules a frame; the frame reads scrollY once and updates every chapter from
 * cached offsets, so scrolling never forces a layout.
 */
const driver = (() => {
  const washes = new Set<Wash>();
  const dir = new ScrollDirection();
  let vp: Viewport = { w: 0, svh: 0, lvh: 0 };
  let raf = 0;
  let last = 0;
  let ro: ResizeObserver | null = null;

  const frame = (now: number) => {
    raf = 0;
    const dt = Math.max(0, (now - last) / 1000);
    last = now;
    const y = window.scrollY;
    const s = dir.update(y, vp.svh);
    let more = false;
    for (const w of washes) if (w.frame(y, s, dt)) more = true;
    if (more) raf = requestAnimationFrame(frame);
  };

  const kick = () => {
    if (raf) return;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  };

  const measureAll = () => {
    vp = readViewport();
    for (const w of washes) w.measure(vp);
    kick();
  };

  // real resizes and rotations only: a mobile toolbar sliding away changes neither 100svh nor 100lvh
  const onResize = () => {
    const n = readViewport();
    if (n.w === vp.w && n.svh === vp.svh && n.lvh === vp.lvh) return;
    measureAll();
  };

  return {
    kick,
    measure: (w: Wash) => {
      w.measure(vp);
      kick();
    },
    add(w: Wash) {
      if (washes.size === 0) {
        vp = readViewport();
        window.addEventListener("scroll", kick, { passive: true });
        window.addEventListener("resize", onResize);
        window.addEventListener("orientationchange", onResize);
        // content above a chapter growing (fonts, images) moves it down the page
        ro = new ResizeObserver(measureAll);
        ro.observe(document.body);
      }
      washes.add(w);
      w.measure(vp);
      kick();
    },
    remove(w: Wash) {
      washes.delete(w);
      if (washes.size > 0) return;
      window.removeEventListener("scroll", kick);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
      ro?.disconnect();
      ro = null;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    },
  };
})();

/**
 * A page section that is revealed by a row of spray nozzles: sweeping left → right when you scroll down to it,
 * and (mirrored) right → left over the next section when you scroll back up to it.
 * The sweep is tied to scroll position (no scroll-jacking: the page scrolls normally,
 * the section just sticks for a moment while the boom passes).
 */
export default function Chapter({ id, label, prev, bg, fg = "#f3e9d8", dot = "rgba(255,255,255,0.045)", children }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const nextRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const track = trackRef.current;
    const stage = stageRef.current;
    const next = nextRef.current;
    const canvas = canvasRef.current;
    if (!track || !stage || !next || !canvas) return;

    // Respect reduced motion: show the finished section, no sweep.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      next.style.clipPath = "none";
      return;
    }

    const fx = new WaterFx(canvas);
    let W = 0;
    let H = 0; // stage height (can be taller than the viewport)
    let CH = 0; // canvas height (the screen-covering part of the stage)
    let rowH = 70;
    let vh = 1; // stable viewport height the wash is measured in (100svh)
    let lvh = 1;
    let top = 0; // track's top edge, page coordinates
    let visible = false;
    let linger = 0; // seconds of run-off to keep drawing after the boom has gone
    let clipKey = "";
    let lastP = Number.NaN;
    let lastS = Number.NaN;

    const setClip = (p: number, s: number) => {
      if (p >= 1) {
        if (clipKey !== "none") next.style.clipPath = "none";
        clipKey = "none";
      } else if (p <= 0) {
        if (clipKey !== "hidden") next.style.clipPath = "inset(0 100% 0 0)";
        clipKey = "hidden";
      } else if (clipKey !== "poly" || p !== lastP || s !== lastS) {
        next.style.clipPath = washPolygon(p, s, W, H, rowH);
        clipKey = "poly";
      }
      lastP = p;
      lastS = s;
    };

    const sizeCanvas = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(CH * dpr);
      canvas.style.height = `${CH}px`;
      fx.setSize(W, CH, dpr);
    };

    const wash: Wash = {
      measure(vp) {
        top = track.getBoundingClientRect().top + window.scrollY;
        W = stage.clientWidth;
        H = stage.offsetHeight;
        vh = vp.svh;
        lvh = vp.lvh;
        rowH = rowPx(vh);
        CH = Math.min(H, lvh);
        clipKey = ""; // sizes changed: redraw the clip next frame
        if (visible) sizeCanvas();
      },
      frame(y, s, dt) {
        const p = washProgress(top - y, vh);
        setClip(p, s);
        if (!visible) return false;
        if (p > 0 && p < 1) {
          fx.draw({ p, s, rowH, live: true }, dt);
          linger = 2.2;
          return true;
        }
        if (linger > 0 || fx.busy) {
          // the boom has gone (off the right edge, or the left one scrolling up); let the last drips run down and fade
          linger -= dt;
          fx.draw({ p, s, rowH, live: false }, dt);
          if (linger > 0 || fx.busy) return true;
        }
        linger = 0;
        fx.reset();
        return false; // idle: restarted by the next scroll
      },
    };

    // Only keep a canvas backing store while the section is on screen.
    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (visible) {
          sizeCanvas();
          driver.kick();
        } else {
          fx.reset();
          canvas.width = 0;
          canvas.height = 0;
          linger = 0;
        }
      },
      { rootMargin: "120px 0px" },
    );
    io.observe(stage);

    // the stage itself changing size (text reflow, a different language)
    const ro = new ResizeObserver(() => driver.measure(wash));
    ro.observe(stage);

    driver.add(wash);

    return () => {
      driver.remove(wash);
      io.disconnect();
      ro.disconnect();
      fx.reset();
    };
  }, []);

  const vars = {
    "--prev": prev,
    "--bg": bg,
    "--fg": fg,
    "--dot": dot,
  } as CSSProperties;

  return (
    <section className={styles.chapter} style={vars} aria-label={label}>
      <div ref={trackRef} className={styles.track} data-chapter="">
        <span id={id} className={styles.anchor} aria-hidden="true" />
        <div ref={stageRef} className={styles.stage}>
          <div className={styles.prev} />
          <div ref={nextRef} className={styles.next}>
            {children}
          </div>
          <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />
        </div>
        {/* scroll runway: real content (not padding) so the stage can stay stuck while it is scrolled through */}
        <div className={styles.runway} aria-hidden="true" />
      </div>
    </section>
  );
}
