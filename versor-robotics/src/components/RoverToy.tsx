"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import styles from "./RoverToy.module.css";
import { RoverBot } from "./illustrations/Bots";
import { HALF_TRACK, ORIGIN_X, ORIGIN_Y, PX_PER_UNIT, SIN_E, VIEW_H, VIEW_W, WHEEL_R } from "./rover3d.config";
import type { Rover3D } from "./rover3d";

const HOLD_MS = 10_000; // how long it stays where you put it
const START_MS = 1_600; // first drive-off after the page loads
const SPEED = 125; // ground speed in px/s

// flick it up on a touch screen and it flies away
const FLICK_SPEED = 900; // upward finger speed on release, screen px/s
const FLICK_MIN = 40; // how far up the finger must have moved since the grab, px
const FLY_S = 0.6; // lift-off to gone
const FADE_S = 0.2; // the same, with reduced motion: just a fade
const FLY_ACCEL = 3000; // upward acceleration while it flies, px/s²

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const wrap = (a: number) => {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
};

type Rect = { l: number; t: number; r: number; b: number };

/** Screen-space footprint of the rover (relative to its ground point) used for "is it over the video?" checks */
const BOX = { hw: 40, up: 80, down: 14 };
const hits = (x: number, y: number, rs: Rect[], pad: number) =>
  rs.some((r) => x + BOX.hw > r.l - pad && x - BOX.hw < r.r + pad && y + BOX.down > r.t - pad && y - BOX.up < r.b + pad);

/**
 * A little 3D rover that lives on top of the page.
 *  - It drives around the screen all by itself and keeps going whatever you do (mouse, keyboard, scrolling).
 *  - The only thing that stops it is you grabbing it: pick it up, drop it anywhere and it stays put for 10 s, then drives off again.
 *  - It never drives over (or sits on) anything marked data-rover-avoid: the video screen and the game.
 *  - On a touch screen, flick it upwards and it flies away; onFlyAway is called once it has gone.
 */
export default function RoverToy({ onFlyAway }: { onFlyAway?: () => void }) {
  const t = useTranslations("rover");
  const root = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const grabRef = useRef<HTMLDivElement>(null);
  const fbRef = useRef<HTMLDivElement>(null);
  const flyAwayRef = useRef(onFlyAway);
  const [fallback, setFallback] = useState(false);
  const [hint, setHint] = useState(true);

  useEffect(() => {
    flyAwayRef.current = onFlyAway;
  });

  useEffect(() => {
    const el = root.current;
    const cv = canvasRef.current;
    const grab = grabRef.current;
    const fb = fbRef.current;
    if (!el || !cv || !grab || !fb) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let rover: Rover3D | null = null;
    let cancelled = false;
    let useFallback = false;
    const toFlat = () => {
      // no WebGL (or the GPU context was lost): carry on with the flat SVG rover
      rover?.dispose();
      rover = null;
      useFallback = true;
      setFallback(true);
    };
    import("./rover3d")
      .then((m) => {
        if (cancelled) return;
        rover = m.createRover3D(cv);
        if (!rover) toFlat();
      })
      .catch(toFlat);
    cv.addEventListener("webglcontextlost", toFlat);

    let W = window.innerWidth;
    let H = window.innerHeight;
    const TOP = 150; // keep the rover's body clear of the header
    const minX = () => 52;
    const maxX = () => Math.max(minX(), W - 52);
    const minY = () => Math.min(TOP, H - 60);
    const maxY = () => H - 14;

    // ground-space position (px): screen x = gx, screen y = gz * sin(elevation)
    let gx = clamp(110, minX(), maxX());
    let gz = (H - 60) / SIN_E;
    let h = -0.35; // heading
    let v = 0; // ground speed px/s
    let om = 0; // yaw rate rad/s
    let steer = 0;
    let roll = 0;
    let pitch = 0;
    let sway = 0;
    let spinL = 0;
    let spinR = 0;
    let lift = 0;
    let liftV = 0;

    type Mode = "hold" | "roam" | "drag" | "eject" | "fly";
    let mode: Mode = "hold";
    let holdUntil = performance.now() + (reduce ? Infinity : START_MS);
    let tgx = gx;
    let tgz = gz;
    let pauseUntil = 0;
    let hidden = false;
    let offX = 0;
    let offY = 0;
    let dvx = 0; // smoothed drag velocity (ground px/s)
    let dvz = 0;
    let ejectT = 0;
    let ejFromX = 0;
    let ejFromZ = 0;
    // the finger's recent path (screen px, ms), for spotting a flick on release
    let trail: { t: number; x: number; y: number }[] = [];
    let downY = 0;
    let flyStart = 0;
    let flyX = 0;
    let flyY = 0;
    let flyVx = 0;
    let flyVy = 0;
    let flyH = 0;
    let flyDir = 1;
    let flyK = 0;
    let raf = 0;
    let last = performance.now();
    let lastRender = 0;
    let avoidEls: HTMLElement[] = [];
    let frameN = 0;

    const sy = () => gz * SIN_E;

    const readAvoid = (): Rect[] => {
      if (frameN % 45 === 0) avoidEls = Array.from(document.querySelectorAll<HTMLElement>("[data-rover-avoid]"));
      const out: Rect[] = [];
      for (const n of avoidEls) {
        const r = n.getBoundingClientRect();
        if (r.width === 0 || r.bottom < -120 || r.top > H + 120) continue;
        out.push({ l: r.left, t: r.top, r: r.right, b: r.bottom });
      }
      return out;
    };

    const pathClear = (x0: number, y0: number, x1: number, y1: number, rs: Rect[]) => {
      if (!rs.length) return true;
      const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 24);
      for (let i = 1; i <= n; i++) {
        const t = i / n;
        if (hits(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, rs, 14)) return false;
      }
      return true;
    };

    /** nearest spot (screen px) just outside every avoid rect */
    const exitPoint = (rs: Rect[]): { x: number; y: number } => {
      const x = gx;
      const y = sy();
      const cands: { x: number; y: number }[] = [];
      for (const r of rs) {
        cands.push({ x: r.l - BOX.hw - 16, y });
        cands.push({ x: r.r + BOX.hw + 16, y });
        cands.push({ x, y: r.b + BOX.up + 16 });
        cands.push({ x, y: r.t - BOX.down - 16 });
      }
      let best: { x: number; y: number } | null = null;
      let bd = Infinity;
      for (const c of cands) {
        const cx = clamp(c.x, minX(), maxX());
        const cy = clamp(c.y, minY(), maxY());
        if (hits(cx, cy, rs, 8)) continue;
        const d = Math.hypot(cx - x, cy - y);
        if (d < bd) {
          bd = d;
          best = { x: cx, y: cy };
        }
      }
      return best ?? { x: clamp(110, minX(), maxX()), y: maxY() - 20 };
    };

    const pickTarget = (rs: Rect[]) => {
      const x0 = gx;
      const y0 = sy();
      for (let i = 0; i < 18; i++) {
        const tx = minX() + Math.random() * (maxX() - minX());
        const ty = minY() + Math.random() * Math.max(1, maxY() - minY());
        if (Math.hypot(tx - x0, ty - y0) < 170 && i < 12) continue;
        if (hits(tx, ty, rs, 14)) continue;
        if (!pathClear(x0, y0, tx, ty, rs)) continue;
        tgx = tx;
        tgz = ty / SIN_E;
        return;
      }
      const e = exitPoint(rs);
      tgx = e.x;
      tgz = e.y / SIN_E;
    };

    // ── dragging ──
    const onDown = (e: PointerEvent) => {
      if (mode === "fly" || (e.pointerType === "mouse" && e.button !== 0)) return;
      e.preventDefault();
      grab.setPointerCapture(e.pointerId);
      mode = "drag";
      offX = e.clientX - gx;
      offY = e.clientY - sy();
      trail = [{ t: e.timeStamp, x: e.clientX, y: e.clientY }];
      downY = e.clientY;
      v = 0;
      om = 0;
      dvx = 0;
      dvz = 0;
      grab.classList.add(styles.lifted);
      setHint(false);
    };
    // the video / game is a wall: while carrying the rover you can slide it along the edge, not onto it
    const resolve = (x: number, y: number, rs: Rect[]) => {
      for (let pass = 0; pass < 2; pass++) {
        for (const r of rs) {
          if (!hits(x, y, [r], 0)) continue;
          const opts = [
            { d: x + BOX.hw - r.l, x: r.l - BOX.hw, y },
            { d: r.r - (x - BOX.hw), x: r.r + BOX.hw, y },
            { d: y + BOX.down - r.t, x, y: r.t - BOX.down },
            { d: r.b - (y - BOX.up), x, y: r.b + BOX.up },
          ];
          opts.sort((a, b) => a.d - b.d);
          x = opts[0].x;
          y = opts[0].y;
        }
      }
      return { x, y };
    };
    /** a fast, mostly vertical swipe upwards at the moment of release (touch / pen only), in screen px/s */
    const flick = (e: PointerEvent) => {
      if (e.pointerType === "mouse" || e.type === "pointercancel") return null;
      const prev = trail[trail.length - 1];
      if (e.clientX !== prev.x || e.clientY !== prev.y) trail.push({ t: e.timeStamp, x: e.clientX, y: e.clientY });
      const end = trail[trail.length - 1];
      if (trail.length < 2 || e.timeStamp - end.t > 70) return null; // the finger had stopped before letting go
      // speed over the last 100 ms of movement
      let i = trail.length - 2;
      while (i > 0 && end.t - trail[i - 1].t <= 100) i--;
      const start = trail[i];
      const dt = (end.t - start.t) / 1000;
      if (dt <= 0) return null;
      const vx = (end.x - start.x) / dt;
      const vy = (end.y - start.y) / dt;
      const up = -vy > FLICK_SPEED && Math.abs(vx) < -vy * 0.6 && downY - end.y >= FLICK_MIN;
      return up ? { vx, vy } : null;
    };
    const onMove = (e: PointerEvent) => {
      if (mode !== "drag") return;
      trail.push({ t: e.timeStamp, x: e.clientX, y: e.clientY });
      if (trail.length > 2 && e.timeStamp - trail[1].t > 150) trail.shift();
      const rs = readAvoid();
      const p = resolve(clamp(e.clientX - offX, 24, W - 24), clamp(e.clientY - offY, 30, H - 4), rs);
      gx = clamp(p.x, 24, W - 24);
      gz = clamp(p.y, 30, H - 4) / SIN_E;
    };
    const onUp = (e: PointerEvent) => {
      if (mode !== "drag") return;
      if (grab.hasPointerCapture(e.pointerId)) grab.releasePointerCapture(e.pointerId);
      grab.classList.remove(styles.lifted);
      const now = performance.now();
      const f = flick(e);
      if (f) {
        // off it goes: lift-off, then up and away with a little tilt and spin
        mode = "fly";
        flyStart = now;
        flyX = gx;
        flyY = sy();
        flyVx = clamp(f.vx, -700, 700);
        flyVy = clamp(-f.vy * 0.4, 360, 900); // starts a little slower than the finger, so the lift-off stays on screen
        flyH = h;
        flyDir = f.vx < 0 ? -1 : 1;
        flyK = 0;
        grab.style.pointerEvents = "none";
        el.style.transition = "none";
        el.style.transformOrigin = `${ORIGIN_X}px ${ORIGIN_Y - 36}px`;
        return;
      }
      const rs = readAvoid();
      v = 0;
      if (hits(gx, sy(), rs, 0)) {
        // dropped on the video: hop off to the nearest free spot
        const ex = exitPoint(rs);
        ejFromX = gx;
        ejFromZ = gz;
        tgx = ex.x;
        tgz = ex.y / SIN_E;
        ejectT = 0;
        mode = "eject";
      } else {
        mode = "hold";
      }
      holdUntil = reduce ? Infinity : now + HOLD_MS;
    };

    const onResize = () => {
      W = window.innerWidth;
      H = window.innerHeight;
      gx = clamp(gx, minX(), maxX());
      gz = clamp(sy(), minY(), maxY()) / SIN_E;
    };

    // ── the loop ──
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (dt <= 0) return;
      frameN++;
      const pgx = gx;
      const pgz = gz;
      const pv = v;
      const rs = readAvoid();

      if (mode === "hold") {
        // coast to a stop, then wait out the hold
        v *= Math.exp(-dt * 7);
        om *= Math.exp(-dt * 9);
        if (v < 1) v = 0;
        if (now >= holdUntil) {
          mode = "roam";
          pickTarget(rs);
          pauseUntil = 0;
        }
      }

      if (mode === "roam") {
        const x = gx;
        const y = sy();
        // if the page scrolled the video under it, head for the nearest free spot
        if (hits(x, y, rs, 0)) {
          const e = exitPoint(rs);
          tgx = e.x;
          tgz = e.y / SIN_E;
        }
        const dx = tgx - gx;
        const dz = tgz - gz;
        const dist = Math.hypot(dx, dz);
        const arrived = dist < 16;
        // the video scrolled into its path? pick another destination
        const blocked = !arrived && rs.length > 0 && frameN % 20 === 0 && !pathClear(x, y, tgx, tgz * SIN_E, rs);
        if (arrived || blocked) {
          if (arrived) pauseUntil = now + 250 + Math.random() * 900;
          pickTarget(rs);
        }
        const waiting = now < pauseUntil;
        const dh = wrap(Math.atan2(tgz - gz, tgx - gx) - h);
        let targetOm: number;
        let targetV: number;
        if (waiting) {
          targetV = 0;
          targetOm = clamp(dh * 3, -1.4, 1.4);
        } else if (Math.abs(dh) > 1.5) {
          // far off the line: pivot on the spot like a skid-steer, then pull away
          targetV = 0;
          targetOm = Math.sign(dh) * Math.min(2.8, 0.9 + Math.abs(dh) * 1.4);
        } else {
          targetOm = clamp(dh * 3.4, -2.3, 2.3);
          const slow = clamp(1 - Math.abs(dh) / 1.5, 0.28, 1);
          const arrive = clamp(dist / 90, 0.35, 1);
          targetV = SPEED * slow * arrive;
        }
        v += (targetV - v) * Math.min(1, dt * 4.5);
        om += (targetOm - om) * Math.min(1, dt * 9);
        h = wrap(h + om * dt);
        gx += Math.cos(h) * v * dt;
        gz += Math.sin(h) * v * dt;
      } else if (mode === "hold") {
        h = wrap(h + om * dt);
        gx += Math.cos(h) * v * dt;
        gz += Math.sin(h) * v * dt;
      } else if (mode === "eject") {
        ejectT = Math.min(1, ejectT + dt / 0.5);
        const k = 1 - Math.pow(1 - ejectT, 3);
        gx = ejFromX + (tgx - ejFromX) * k;
        gz = ejFromZ + (tgz - ejFromZ) * k;
        if (ejectT >= 1) mode = "hold";
      } else if (mode === "drag") {
        const ivx = dt > 0 ? (gx - pgx) / dt : 0;
        const ivz = dt > 0 ? (gz - pgz) / dt : 0;
        dvx += (ivx - dvx) * Math.min(1, dt * 12);
        dvz += (ivz - dvz) * Math.min(1, dt * 12);
        const sp = Math.hypot(dvx, dvz);
        if (sp > 60) {
          const dh = wrap(Math.atan2(dvz, dvx) - h);
          om = clamp(dh * 7, -6, 6);
          h = wrap(h + dh * Math.min(1, dt * 7));
        } else {
          om *= Math.exp(-dt * 8);
        }
        v = Math.min(sp, 260) * 0.25;
      } else if (mode === "fly") {
        // driven by the time since release, not by frames, so it plays the same at any frame rate
        const s = (now - flyStart) / 1000;
        flyK = Math.min(1, s / (reduce ? FADE_S : FLY_S));
        v = 0;
        om = 0;
        if (!reduce) h = wrap(flyH + flyDir * 6 * s * s);
      }

      // keep it on screen
      if (mode !== "fly") {
        gx = clamp(gx, 24, W - 24);
        gz = clamp(sy(), 30, H - 4) / SIN_E;
      }

      // lift / drop spring (bounces a little on landing)
      const liftTarget = mode === "drag" || mode === "fly" ? 1 : 0;
      liftV += ((liftTarget - lift) * 190 - liftV * 12) * dt;
      lift += liftV * dt;

      // body dynamics
      const vn = clamp(v / SPEED, 0, 1.3);
      const accel = (v - pv) / dt;
      const k = Math.min(1, dt * 8);
      roll += (clamp(-om * vn * 0.1, -0.17, 0.17) - roll) * k;
      pitch += (clamp(accel * 0.00035, -0.07, 0.07) + Math.sin(now / 1000 * 15) * 0.011 * vn - pitch) * k;
      steer += (clamp(om * 0.17, -0.42, 0.42) - steer) * k;
      const carried = mode === "drag" ? 1 : 0;
      sway += ((Math.sin(now / 1000 * 3.2) * 0.07 + clamp(dvx / 900, -0.12, 0.12)) * carried - sway) * Math.min(1, dt * 6);

      // wheels: left/right turn at different rates when steering (that is what makes the turns look real)
      const vw = v / PX_PER_UNIT;
      if (mode === "fly") {
        spinL += 14 * dt;
        spinR += 14 * dt;
      } else if (mode === "drag") {
        spinL += 2.2 * dt * (1 + vn * 2);
        spinR += 2.2 * dt * (1 + vn * 2);
      } else {
        spinL += ((vw + om * HALF_TRACK) / WHEEL_R) * dt;
        spinR += ((vw - om * HALF_TRACK) / WHEEL_R) * dt;
      }

      // is it over the video / game? then it is simply not there
      const nowHidden = mode !== "drag" && mode !== "fly" && hits(gx, sy(), rs, 0);
      if (nowHidden !== hidden) {
        hidden = nowHidden;
        el.classList.toggle(styles.hidden, hidden);
      }

      // place it
      if (mode === "fly") {
        const s = (now - flyStart) / 1000;
        const rise = reduce ? 0 : flyVy * s + 0.5 * FLY_ACCEL * s * s;
        const drift = reduce ? 0 : flyVx * 0.35 * s;
        const tilt = reduce ? 0 : flyDir * 14 * Math.min(1, flyK * 2.5);
        const scale = reduce ? 1 : 1 - 0.3 * flyK;
        el.style.transform = `translate3d(${(flyX + drift - ORIGIN_X).toFixed(1)}px, ${(flyY - rise - ORIGIN_Y).toFixed(1)}px, 0) rotate(${tilt.toFixed(2)}deg) scale(${scale.toFixed(3)})`;
        el.style.opacity = (1 - (reduce ? flyK : flyK * flyK)).toFixed(3);
      } else {
        const px = gx;
        const py = sy();
        el.style.transform = `translate3d(${(px - ORIGIN_X).toFixed(1)}px, ${(py - ORIGIN_Y).toFixed(1)}px, 0)`;
      }

      const settled = mode === "hold" && v < 1 && Math.abs(om) < 0.02 && Math.abs(lift) < 0.004 && Math.abs(liftV) < 0.02;
      if (!hidden && (!settled || now - lastRender > 66)) {
        lastRender = now;
        if (rover) {
          try {
            rover.render(
              {
                heading: h,
                steer,
                roll,
                pitch,
                spinL,
                spinR,
                lift,
                sway,
                moveX: (gx - pgx) / PX_PER_UNIT,
                moveZ: (gz - pgz) / PX_PER_UNIT,
                drive: mode === "roam" || mode === "eject" ? clamp(vn * 1.1, 0, 1) : mode === "drag" ? clamp(vn * 0.8, 0, 0.5) : 0,
              },
              Math.min(dt, 0.05),
              now / 1000,
            );
          } catch {
            toFlat();
          }
          if (!el.classList.contains(styles.ready)) el.classList.add(styles.ready);
        } else if (useFallback) {
          fb.style.transform = `translateY(${(-Math.max(0, lift) * 12).toFixed(1)}px) scaleX(${Math.cos(h) >= 0 ? 1 : -1}) rotate(${(Math.sin(h) * 6).toFixed(1)}deg)`;
          fb.classList.toggle(styles.driving, v > 8);
          if (!el.classList.contains(styles.ready)) el.classList.add(styles.ready);
        }
      }

      // flown away: stop here and let the parent unmount it
      if (mode === "fly" && flyK >= 1) {
        cancelAnimationFrame(raf);
        el.style.visibility = "hidden";
        flyAwayRef.current?.();
      }
    };

    grab.addEventListener("pointerdown", onDown);
    grab.addEventListener("pointermove", onMove);
    grab.addEventListener("pointerup", onUp);
    grab.addEventListener("pointercancel", onUp);
    window.addEventListener("resize", onResize);
    raf = requestAnimationFrame(frame);

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      grab.removeEventListener("pointerdown", onDown);
      grab.removeEventListener("pointermove", onMove);
      grab.removeEventListener("pointerup", onUp);
      grab.removeEventListener("pointercancel", onUp);
      window.removeEventListener("resize", onResize);
      cv.removeEventListener("webglcontextlost", toFlat);
      rover?.dispose();
    };
  }, []);

  return (
    <div ref={root} className={styles.rover} aria-hidden="true">
      <canvas ref={canvasRef} className={styles.canvas} style={{ width: VIEW_W, height: VIEW_H, display: fallback ? "none" : "block" }} />
      <div ref={grabRef} className={styles.grab} style={{ left: ORIGIN_X - 44, top: ORIGIN_Y - 84 }}>
        {hint ? <span className={styles.hint}>{t("hint")}</span> : null}
        <div ref={fbRef} className={styles.fb} style={{ display: fallback ? "block" : "none" }}>
          <RoverBot className={styles.fbSvg} />
        </div>
      </div>
    </div>
  );
}
