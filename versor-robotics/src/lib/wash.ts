/**
 * Geometry for the "spray wash" section transition.
 *
 * Scrolling down, a vertical boom of spray nozzles sweeps left → right as the progress `p` goes 0 → 1 and the
 * water front in front of it reveals the new section. Scrolling up, a mirrored boom comes in from the right edge
 * and sweeps right → left as `p` goes 1 → 0, and its front reveals the previous section the same way.
 * The front is a smooth, living curve: every jet pushes it forward a little further than the gaps between jets,
 * and the whole thing ripples.
 *
 * Everything here is a pure function of the scroll position (`p`) and the scroll direction (`s`, 0 = down,
 * 1 = up, in between while the visitor turns round), never of time or frame rate. The same functions drive the
 * clip-path that reveals the section and the canvas that draws the water, so the two always agree.
 */

/** The wash starts when the section's track is this far (in viewport heights) below the top of the screen … */
export const WASH_TOP = 0.25;
/** … and takes this many viewport heights of scrolling to finish */
export const WASH_SPAN = 0.8;

/** How far the boom starts off-screen (fraction of the screen width) */
const START = 0.18;

/** How far in front of the boom the water front sits between jets */
const LEAD = 0.065;

/** Ripple phase per unit of progress: how far the ripples travel while one wash plays */
const RIPPLE = 3;

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

const hash = (n: number) => {
  const s = Math.sin(n * 91.7 + 17.3) * 12345.678;
  return s - Math.floor(s);
};

/** Deterministic jet reach per nozzle row: 0.07 – 0.16 of screen width */
export function reach(i: number): number {
  const s = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return 0.07 + (s - Math.floor(s)) * 0.09;
}

/** Boom position (fraction of the width) for progress p of a left → right sweep (starts off-screen left, ends off-screen right) */
export function boomX(p: number): number {
  return -START + p * (1 + START + 0.04);
}

/** Screen x (px) of the downward boom (sweeping →) and the upward one (mirrored, sweeping ←) at progress p */
export const boomDown = (p: number, W: number) => boomX(p) * W;
export const boomUp = (p: number, W: number) => W - boomX(1 - p) * W;

/** Row height in px for a given (stable) viewport height */
export function rowPx(vh: number): number {
  return clamp(vh / 12, 56, 84);
}

/** Progress of the wash for a section track whose top edge is `trackTop` px from the top of the viewport */
export function washProgress(trackTop: number, vh: number): number {
  return clamp((vh * WASH_TOP - trackTop) / (vh * WASH_SPAN), 0, 1);
}

/** Scroll range (absolute page y) over which a track's wash plays */
export function washZone(trackTopAbs: number, vh: number): [number, number] {
  const a = trackTopAbs - vh * WASH_TOP;
  return [a, a + vh * WASH_SPAN];
}

/**
 * x position (px) of a left → right water front at height y, for progress p.
 * `rowH` is the nozzle spacing, `W` the screen width.
 */
export function edgeX(y: number, p: number, W: number, rowH: number): number {
  const t = p * RIPPLE; // the ripples move with the scroll, not the clock
  const bx = boomX(p);
  const row = Math.floor(y / rowH);
  let push = 0;
  // each nearby jet adds a smooth, slightly different bump, so the front fingers forward where a jet hits
  for (let i = Math.max(0, row - 1); i <= row + 1; i++) {
    const cy = (i + 0.5 + (hash(i + 5) - 0.5) * 0.36) * rowH;
    const sig = rowH * (0.24 + 0.14 * hash(i + 11));
    const d = (y - cy) / sig;
    const flutter = 0.8 + 0.2 * Math.sin(t * 5.3 + i * 1.7);
    push += (reach(i) - 0.07) * 1.35 * flutter * Math.exp(-d * d);
  }
  // slow swell across the whole front + fine ripple on top
  const swell = 0.026 * Math.sin(y * 0.0042 + t * 0.9 + p * 3.1) + 0.012 * Math.sin(y * 0.0113 - t * 1.3 + 2.0);
  const ripple = 0.004 * Math.sin(y * 0.037 - t * 3.1) + 0.0025 * Math.sin(y * 0.09 + t * 4.7);
  return (bx + LEAD + push + swell + ripple) * W;
}

/**
 * x position (px) of the water front at height y: everything left of it shows the section, everything right of
 * it the previous colour. `s` blends the downward front (s = 0) into the mirrored upward one (s = 1).
 */
export function frontX(y: number, p: number, s: number, W: number, rowH: number): number {
  const down = s < 1 ? edgeX(y, p, W, rowH) : 0;
  if (s <= 0) return down;
  const up = W - edgeX(y, 1 - p, W, rowH);
  return s >= 1 ? up : down + (up - down) * s;
}

/** clip-path polygon (px) that reveals everything left of the water front */
export function washPolygon(p: number, s: number, W: number, H: number, rowH: number): string {
  const step = 8;
  const pts: string[] = ["0px 0px"];
  for (let y = 0; y < H; y += step) {
    pts.push(`${Math.max(0, frontX(y, p, s, W, rowH)).toFixed(1)}px ${y}px`);
  }
  pts.push(`${Math.max(0, frontX(H, p, s, W, rowH)).toFixed(1)}px ${H}px`);
  pts.push(`0px ${H}px`);
  return `polygon(${pts.join(",")})`;
}

/* ───────── scroll direction ───────── */

/** Reverse scrolling shorter than this (px) is jitter, not a change of direction */
export const DIR_HYSTERESIS = 16;

/** How much scrolling (fraction of the viewport height) the turn from one direction to the other takes */
const DIR_BLEND = 0.1;

/**
 * Turns scroll positions into the direction blend `s` (0 = scrolling down, 1 = scrolling up).
 * It only looks at positions, never at time: a reversal counts once the page has moved DIR_HYSTERESIS px back
 * from its furthest point, and from there `s` moves with the distance scrolled, so the turn is smooth and lands
 * at the same place on every device and frame rate.
 */
export class ScrollDirection {
  private dir: 1 | -1 = 1;
  private extreme = Number.NaN; // furthest point in the current direction
  private from = 0; // s when the current direction began
  private turnAt = 0; // where it began
  private far = 0; // furthest distance travelled since then
  s = 0;

  update(y: number, vh: number): number {
    if (Number.isNaN(this.extreme)) {
      this.extreme = y;
      this.turnAt = y;
      return this.s;
    }
    if ((y - this.extreme) * this.dir > 0) this.extreme = y;
    else if ((this.extreme - y) * this.dir > DIR_HYSTERESIS) {
      this.dir = this.dir === 1 ? -1 : 1;
      this.from = this.s;
      this.turnAt = y;
      this.extreme = y;
      this.far = 0;
    }
    this.far = Math.max(this.far, (y - this.turnAt) * this.dir);
    const k = this.far / Math.max(1, vh * DIR_BLEND);
    this.s = this.dir === 1 ? Math.max(0, this.from - k) : Math.min(1, this.from + k);
    return this.s;
  }
}

/* ───────── stable viewport ───────── */

export type Viewport = {
  /** width of the layout viewport (px) */
  w: number;
  /** small viewport height (100svh): what the wash is measured in; doesn't change when a mobile address bar hides */
  svh: number;
  /** large viewport height (100lvh): how tall the water canvas must be to cover the screen */
  lvh: number;
};

let probe: HTMLDivElement | null = null;

/**
 * Measures 100svh / 100lvh with a hidden probe. These only change on real resizes and rotations, never when a
 * mobile browser's toolbars slide in and out. (Browsers without the units get 100vh for both.) Reads layout:
 * call it on load and on resize, not while scrolling.
 */
export function readViewport(): Viewport {
  if (!probe) {
    probe = document.createElement("div");
    probe.setAttribute("aria-hidden", "true");
    probe.style.cssText = "position:fixed;left:0;top:0;width:0;visibility:hidden;pointer-events:none;contain:strict";
    probe.innerHTML =
      '<div style="position:absolute;width:0;height:100vh;height:100svh"></div><div style="position:absolute;width:0;height:100vh;height:100lvh"></div>';
    document.body.appendChild(probe);
  }
  const [a, b] = probe.children as HTMLCollectionOf<HTMLElement>;
  const svh = a.getBoundingClientRect().height || window.innerHeight;
  const lvh = Math.max(svh, b.getBoundingClientRect().height || svh);
  return { w: document.documentElement.clientWidth || window.innerWidth, svh, lvh };
}
