import { boomDown, boomUp, clamp, frontX } from "./wash";

/**
 * The water for the spray wash: a steel boom with a nozzle per row, tapered jets that break up as they
 * travel, splash and mist where they hit, a glossy wet film on the front, and little rivulets that run
 * down the screen behind it. Everything is drawn on one viewport-sized canvas.
 *
 * The boom, jets and front follow the scroll (see wash.ts). Droplets, mist and rivulets are simulated in fixed
 * 1/120 s steps with a seeded random generator, so 60 Hz, 120 Hz and slow devices all see the same water.
 * The downward boom sweeps → and fires right; the upward one is its mirror image. While the visitor turns round,
 * one fades out as the other fades in.
 */

/** sim step (s) and the most real time one frame may catch up (a slow frame plays at most this much) */
const STEP = 1 / 120;
const MAX_CATCH_UP = 0.1;

/** side: +1 = the downward boom (fires →), -1 = the upward boom (fires ←) */
type Side = 1 | -1;
type Drop = { x: number; y: number; vx: number; vy: number; age: number; ttl: number; r: number; lim?: number; side: Side };
type Puff = { x: number; y: number; vx: number; vy: number; age: number; ttl: number; s: number };
type Riv = { x: number; y0: number; head: number; vel: number; travel: number; len: number; w: number; alpha: number; dead: boolean; side: Side };
type Jet = { side: Side; alpha: number; ex: number; ey: number; nx: number; cy: number; len: number; rowH: number };

const WATER = "236,248,252";
/** sprites are drawn at this scale so they stay sharp on the (dpr ≤ 1.5) canvas */
const SS = 2;

type Sprites = {
  mist: HTMLCanvasElement;
  dark: HTMLCanvasElement;
  pipe: HTMLCanvasElement;
  shadow: HTMLCanvasElement;
  nozzle: HTMLCanvasElement;
  collar: HTMLCanvasElement;
  drop: HTMLCanvasElement;
};

let cache: Sprites | null = null;

/** Everything that looks the same every frame is drawn once, here. */
function makeSprites(): Sprites {
  if (cache) return cache;
  const mk = (w: number, h: number, scale = 1) => {
    const c = document.createElement("canvas");
    c.width = Math.ceil(w * scale);
    c.height = Math.ceil(h * scale);
    const g = c.getContext("2d")!;
    g.scale(scale, scale);
    return [c, g] as const;
  };

  // soft round puff of mist
  const [mist, mg] = mk(64, 64);
  {
    const r = mg.createRadialGradient(32, 32, 0, 32, 32, 32);
    r.addColorStop(0, `rgba(${WATER},0.9)`);
    r.addColorStop(0.35, `rgba(${WATER},0.4)`);
    r.addColorStop(1, `rgba(${WATER},0)`);
    mg.fillStyle = r;
    mg.fillRect(0, 0, 64, 64);
  }

  // darkening of the screen just behind the front (the surface is wet); darkest at the right end
  const [dark, dg] = mk(256, 1);
  {
    const l = dg.createLinearGradient(0, 0, 256, 0);
    l.addColorStop(0, "rgba(4,22,26,0)");
    l.addColorStop(0.55, "rgba(4,22,26,0.06)");
    l.addColorStop(0.88, "rgba(4,22,26,0.16)");
    l.addColorStop(1, "rgba(4,22,26,0.26)");
    dg.fillStyle = l;
    dg.fillRect(0, 0, 256, 1);
  }

  // boom pipe cross-section (14 px, brushed steel lit from behind the boom), stretched to the canvas height
  const [pipe, pg] = mk(14, 1, SS);
  {
    const l = pg.createLinearGradient(0, 0, 14, 0);
    l.addColorStop(0, "#0e1918");
    l.addColorStop(0.2, "#37504f");
    l.addColorStop(0.45, "#a8c0c0");
    l.addColorStop(0.58, "#eaf4f3");
    l.addColorStop(0.8, "#5f7b7c");
    l.addColorStop(1, "#111e1d");
    pg.fillStyle = l;
    pg.fillRect(0, 0, 14, 1);
  }

  // shadow the boom casts on the screen ahead of it
  const [shadow, sg] = mk(34, 1);
  {
    const l = sg.createLinearGradient(0, 0, 34, 0);
    l.addColorStop(0, "rgba(0,0,0,0.22)");
    l.addColorStop(1, "rgba(0,0,0,0)");
    sg.fillStyle = l;
    sg.fillRect(0, 0, 34, 1);
  }

  // feed hose + nozzle body + brass tip, for a boom at x = 0 firing →. Sprite origin: (bx - 0, cy - 6)
  const [nozzle, ng] = mk(26, 12, SS);
  {
    ng.fillStyle = "#1a2a29";
    ng.fillRect(5, 3, 6, 6);
    const b = ng.createLinearGradient(0, 0, 0, 12);
    b.addColorStop(0, "#d3dfde");
    b.addColorStop(0.45, "#7e9697");
    b.addColorStop(1, "#2e4242");
    ng.fillStyle = b;
    ng.beginPath();
    ng.roundRect(8, 0, 12, 12, 2);
    ng.fill();
    const tg = ng.createLinearGradient(0, 2.5, 0, 9.5);
    tg.addColorStop(0, "#f3d28b");
    tg.addColorStop(1, "#a9772a");
    ng.fillStyle = tg;
    ng.fillRect(19, 2.5, 5, 7);
    ng.fillStyle = "#0b1413";
    ng.fillRect(23, 4.8, 1.6, 2.4);
  }

  // clamp collar between rows (18 × 5, centred on the pipe)
  const [collar, cg] = mk(18, 5, SS);
  {
    cg.fillStyle = "#142120";
    cg.fillRect(0, 0, 18, 5);
    cg.fillStyle = "rgba(255,255,255,0.16)";
    cg.fillRect(0, 0, 18, 1);
  }

  // a slow droplet: water bead with a dark rim and a highlight (radius 8, drawn scaled)
  const [drop, dpg] = mk(20, 20, SS);
  {
    dpg.fillStyle = `rgba(${WATER},0.8)`;
    dpg.beginPath();
    dpg.arc(10, 10, 8, 0, Math.PI * 2);
    dpg.fill();
    dpg.strokeStyle = "rgba(6,40,50,0.28)";
    dpg.lineWidth = 2.4;
    dpg.stroke();
    dpg.fillStyle = "rgba(255,255,255,0.95)";
    dpg.beginPath();
    dpg.arc(7.6, 7.6, 2.8, 0, Math.PI * 2);
    dpg.fill();
  }

  cache = { mist, dark, pipe, shadow, nozzle, collar, drop };
  return cache;
}

/** small, fast, seedable PRNG (mulberry32) */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type WashFrame = {
  /** wash progress 0 → 1 (scroll position) */
  p: number;
  /** direction blend: 0 = scrolling down, 1 = scrolling up */
  s: number;
  rowH: number;
  /** true while a boom is on screen; false afterwards (only drips and run-off remain) */
  live: boolean;
};

export class WaterFx {
  private ctx: CanvasRenderingContext2D;
  private W = 0;
  private CH = 0;
  private dpr = 1;
  private xs = new Float32Array(0);
  private drops: Drop[] = [];
  private puffs: Puff[] = [];
  private rivs: Riv[] = [];
  private jets: Jet[] = [];
  private lastP = -1;
  private spawnAcc = 0;
  private acc = 0; // real time not yet simulated
  private simT = 0; // simulated time (s), advances in STEP increments
  private rand = rng(1); // sim (fixed steps only, so the sequence never depends on the frame rate)
  private rivRand = rng(2); // rivulets (spawned by scroll distance)
  private dirty = false;

  constructor(canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext("2d")!;
  }

  setSize(W: number, CH: number, dpr = 1) {
    this.W = W;
    this.CH = CH;
    this.dpr = dpr;
    this.xs = new Float32Array(Math.ceil(CH / 4) + 2);
    this.dirty = true;
  }

  /** anything still falling or running? */
  get busy() {
    return this.drops.length > 0 || this.puffs.length > 0 || this.rivs.length > 0;
  }

  reset() {
    this.drops.length = 0;
    this.puffs.length = 0;
    this.rivs.length = 0;
    this.jets.length = 0;
    this.lastP = -1;
    this.spawnAcc = 0;
    this.acc = 0;
    this.simT = 0;
    this.rand = rng(1);
    this.rivRand = rng(2);
    if (!this.dirty) return;
    this.dirty = false;
    // wipe the whole backing store, then go back to CSS-pixel units (dropping the dpr scale here
    // made every later frame draw at 1/dpr size on high-density screens)
    const { ctx, dpr } = this;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  /** One fixed sim step: move and age everything, and let the jets shed new drops and mist. */
  private step(live: boolean) {
    const dt = STEP;
    const R = this.rand;
    const CH = this.CH;
    this.simT += dt;

    if (live) {
      for (const j of this.jets) {
        // splash at the impact, flung back towards the boom
        // a fading boom sheds proportionally less
        if (R() < 30 * dt * j.alpha && this.drops.length < 420) {
          const sp = 50 + R() * 260;
          const ang = Math.PI + (R() - 0.5) * 2.2;
          this.drops.push({
            x: j.ex,
            y: j.ey + (R() - 0.5) * j.rowH * 0.5,
            vx: j.side * (Math.cos(ang) * sp * 0.8 + 40),
            vy: Math.sin(ang) * sp - 60,
            age: 0,
            ttl: 0.35 + R() * 0.55,
            r: 0.8 + R() * 1.9,
            side: j.side,
          });
        }
        // droplets shed by the stream, racing ahead of it
        if (R() < 11 * dt * j.alpha && this.drops.length < 420) {
          const u = 0.3 + R() * 0.7;
          const droop = Math.min(20, 3 + j.len * 0.05);
          this.drops.push({
            x: j.nx + j.side * j.len * u,
            y: j.cy + droop * u * u + (R() - 0.5) * 5 * u,
            vx: j.side * (380 + R() * 240),
            vy: (R() - 0.5) * 110 * u,
            age: 0,
            ttl: 0.1 + R() * 0.16,
            r: 0.7 + R() * 1.1,
            lim: j.ex + j.side * 4,
            side: j.side,
          });
        }
        // the odd puff of mist drifting back off the impact
        if (R() < 4.5 * dt * j.alpha && this.puffs.length < 36) {
          this.puffs.push({
            x: j.ex - j.side * 8,
            y: j.ey + (R() - 0.5) * j.rowH * 0.6,
            vx: -j.side * (10 + R() * 50),
            vy: -8 - R() * 34,
            age: 0,
            ttl: 0.9 + R() * 0.8,
            s: 36 + R() * 44,
          });
        }
      }
    }

    for (let i = this.drops.length - 1; i >= 0; i--) {
      const d = this.drops[i];
      d.age += dt;
      const past = d.lim !== undefined && (d.x - d.lim) * d.side > 0;
      if (d.age >= d.ttl || d.y > CH + 20 || past) {
        this.drops.splice(i, 1);
        continue;
      }
      d.vy += 720 * dt;
      d.vx *= 1 - 1.2 * dt;
      d.x += d.vx * dt;
      d.y += d.vy * dt;
    }

    for (let i = this.puffs.length - 1; i >= 0; i--) {
      const q = this.puffs[i];
      q.age += dt;
      if (q.age >= q.ttl) {
        this.puffs.splice(i, 1);
        continue;
      }
      q.x += q.vx * dt;
      q.y += q.vy * dt;
    }

    for (let i = this.rivs.length - 1; i >= 0; i--) {
      const r = this.rivs[i];
      if (!r.dead) {
        r.vel = Math.min(230, r.vel + 95 * dt);
        r.head += r.vel * dt;
        if (r.head - r.y0 >= r.travel) {
          r.head = r.y0 + r.travel;
          r.dead = true;
        }
      } else {
        r.alpha -= dt * 0.55;
      }
      const tail = Math.max(r.y0, r.head - r.len - (r.dead ? (1 - r.alpha) * 140 : 0));
      if (r.alpha <= 0 || tail >= CH) this.rivs.splice(i, 1);
    }
  }

  /**
   * Advances the simulation by `dt` seconds of real time (in fixed steps) and draws the frame for scroll state `f`.
   */
  draw(f: WashFrame, dt: number) {
    const { ctx, W, CH } = this;
    const { p, s, rowH, live } = f;
    const sp = makeSprites();
    this.dirty = true;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, W, CH);

    const rows = Math.ceil(CH / rowH);
    const step = 4;
    const n = Math.ceil(CH / step) + 1;
    const xs = this.xs;
    if (live) for (let k = 0; k < n; k++) xs[k] = frontX(k * step, p, s, W, rowH);

    // how strongly each boom shows: the downward one fades out as the visitor turns round, the upward one in
    const sides: [Side, number, number][] = [
      [1, 1 - s, boomDown(p, W)],
      [-1, s, boomUp(p, W)],
    ];

    // ── where the jets are this frame (the sim spawns from these) ──
    this.jets.length = 0;
    if (live) {
      for (const [side, alpha, bx] of sides) {
        if (alpha < 0.02) continue;
        for (let i = 0; i < rows; i++) {
          const cy = (i + 0.5) * rowH;
          const ex = frontX(cy, p, s, W, rowH) - side * 3;
          const nx = bx + side * 15;
          if ((side > 0 && (nx > W + 20 || ex < 0)) || (side < 0 && (nx < -20 || ex > W))) continue;
          const len = (ex - nx) * side;
          if (len < 12) continue;
          this.jets.push({ side, alpha, ex, ey: cy + Math.min(20, 3 + len * 0.05), nx, cy, len, rowH });
        }
      }
    }

    // ── rivulets: spawned behind the front as it advances (by scroll distance, not time) ──
    if (live) {
      if (this.lastP >= 0) {
        this.spawnAcc += (Math.abs(p - this.lastP) * W * 1.22) / 46;
        while (this.spawnAcc >= 1) {
          this.spawnAcc -= 1;
          if (this.rivs.length > 54) break;
          const side: Side = this.rivRand() < s ? -1 : 1;
          const y = this.rivRand() * CH * 0.92;
          const e = frontX(y, p, s, W, rowH);
          if (side > 0 ? e < 30 : e > W - 30) continue;
          this.rivs.push({
            x: e - side * (10 + this.rivRand() * 38),
            y0: y,
            head: y,
            vel: 18 + this.rivRand() * 40,
            travel: 70 + this.rivRand() * 200,
            len: 26 + this.rivRand() * 70,
            w: 0.9 + this.rivRand() * 1.5,
            alpha: 1,
            dead: false,
            side,
          });
        }
      }
      this.lastP = p;
    }

    // ── advance the simulation in fixed steps ──
    this.acc = Math.min(this.acc + Math.max(0, dt), MAX_CATCH_UP);
    while (this.acc >= STEP) {
      this.acc -= STEP;
      this.step(live);
    }
    const t = this.simT;

    // ── 1. the wet surface behind the front (on the side the boom came from) ──
    if (live) {
      for (const [side, alpha] of sides) {
        if (alpha < 0.02) continue;
        ctx.globalAlpha = alpha;
        for (let k = 0; k < n - 1; k++) {
          const e = xs[k];
          const y = k * step;
          if (side > 0) {
            if (e <= 2) continue;
            ctx.drawImage(sp.dark, 0, 0, 256, 1, e - 240, y, 240, step);
          } else {
            if (e >= W - 2) continue;
            ctx.save();
            ctx.translate(e, 0);
            ctx.scale(-1, 1);
            ctx.drawImage(sp.dark, 0, 0, 256, 1, -240, y, 240, step);
            ctx.restore();
          }
        }
      }
      ctx.globalAlpha = 1;
    }

    // ── 2. rivulets running down the wet screen (kept on their side of the front while it is on screen) ──
    ctx.lineCap = "round";
    for (const side of [1, -1] as const) {
      ctx.save();
      if (live) {
        const clip = new Path2D();
        const edgeOf = side > 0 ? 0 : W;
        clip.moveTo(edgeOf, 0);
        for (let k = 0; k < n; k++) clip.lineTo(clamp(xs[k], 0, W), k * step);
        clip.lineTo(edgeOf, CH);
        clip.closePath();
        ctx.clip(clip);
      }
      for (const r of this.rivs) {
        if (r.side !== side) continue;
        const tail = Math.max(r.y0, r.head - r.len - (r.dead ? (1 - r.alpha) * 140 : 0));
        const a = Math.max(0, r.alpha);
        const grad = ctx.createLinearGradient(0, tail, 0, r.head);
        grad.addColorStop(0, `rgba(${WATER},0)`);
        grad.addColorStop(1, `rgba(${WATER},${0.5 * a})`);
        ctx.strokeStyle = grad;
        ctx.lineWidth = r.w;
        ctx.beginPath();
        ctx.moveTo(r.x, tail);
        ctx.lineTo(r.x, r.head);
        ctx.stroke();
        // a faint shadow beside it so the water reads on pale and dark colours alike
        ctx.strokeStyle = `rgba(6,36,44,${0.16 * a})`;
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(r.x + r.w * 0.9, Math.max(tail, r.head - r.len * 0.7));
        ctx.lineTo(r.x + r.w * 0.9, r.head);
        ctx.stroke();
        // bead at the head
        ctx.fillStyle = `rgba(${WATER},${0.75 * a})`;
        ctx.beginPath();
        ctx.arc(r.x, r.head, r.w * 1.15 + 0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = `rgba(255,255,255,${0.9 * a})`;
        ctx.beginPath();
        ctx.arc(r.x - 0.4, r.head - 0.5, r.w * 0.45, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // ── 3. glossy rim of the water front ──
    if (live) {
      const edge = new Path2D();
      edge.moveTo(clamp(xs[0], 0, W), 0);
      for (let k = 1; k < n; k++) edge.lineTo(clamp(xs[k], 0, W), k * step);
      // the light and shadow sides swap with the direction of travel (smoothly, as the booms crossfade)
      const lit = 1 - 2 * s;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.save();
      ctx.translate(2.4 * lit, 0);
      ctx.strokeStyle = "rgba(6,40,50,0.26)";
      ctx.lineWidth = 1.3;
      ctx.stroke(edge);
      ctx.restore();
      ctx.strokeStyle = `rgba(${WATER},0.07)`;
      ctx.lineWidth = 9;
      ctx.stroke(edge);
      ctx.strokeStyle = `rgba(${WATER},0.16)`;
      ctx.lineWidth = 3.6;
      ctx.stroke(edge);
      ctx.save();
      ctx.translate(-lit, 0);
      ctx.strokeStyle = `rgba(255,255,255,0.5)`;
      ctx.lineWidth = 1.1;
      ctx.stroke(edge);
      ctx.restore();
    }

    // ── 4. mist puffs, then the jets with their foam ──
    for (const q of this.puffs) {
      const k = q.age / q.ttl;
      const sz = q.s * (0.6 + k * 1.2);
      ctx.globalAlpha = 0.16 * Math.sin(Math.PI * Math.min(1, k * 1.15)) ** 1.2;
      ctx.drawImage(sp.mist, q.x - sz / 2, q.y - sz / 2, sz, sz);
    }
    ctx.globalAlpha = 1;

    if (live) {
      for (const [side, alpha, bx] of sides) {
        if (alpha < 0.02) continue;
        for (let i = 0; i < rows; i++) {
          const cy = (i + 0.5) * rowH;
          const ex = frontX(cy, p, s, W, rowH) - side * 3;
          const nx = bx + side * 15;
          if ((side > 0 && (nx > W + 20 || ex < 0)) || (side < 0 && (nx < -20 || ex > W))) continue;
          const len = (ex - nx) * side;
          if (len < 12) continue;
          this.drawJet(side, alpha, nx, cy, ex, len, i, t);
        }
      }
    }

    // ── 5. droplets ──
    for (const d of this.drops) {
      const a = clamp(1 - d.age / d.ttl, 0, 1);
      const spd = Math.hypot(d.vx, d.vy);
      if (spd > 240) {
        // fast drops are smeared along their path, like a camera would see them
        const k = Math.min(0.02, 8 / spd);
        ctx.strokeStyle = `rgba(${WATER},${0.6 * a})`;
        ctx.lineWidth = d.r * 1.1;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(d.x, d.y);
        ctx.lineTo(d.x - d.vx * k, d.y - d.vy * k);
        ctx.stroke();
      } else {
        const sz = d.r * 2.5;
        ctx.globalAlpha = a;
        ctx.drawImage(sp.drop, d.x - sz / 2, d.y - sz / 2, sz, sz);
        ctx.globalAlpha = 1;
      }
    }

    // ── 6. the booms (in front of everything) ──
    if (live) {
      for (const [side, alpha, bx] of sides) {
        if (alpha < 0.02 || bx < -40 || bx > W + 40) continue;
        ctx.save();
        ctx.globalAlpha = alpha;
        // draw in the boom's own frame: x = 0 on the pipe, +x towards where it fires
        ctx.translate(bx, 0);
        ctx.scale(side, 1);
        ctx.drawImage(sp.shadow, 6, 0, 34, CH);
        ctx.drawImage(sp.pipe, -7, 0, 14, CH);
        for (let i = 0; i < rows; i++) {
          const cy = (i + 0.5) * rowH;
          ctx.drawImage(sp.collar, -9, cy - rowH / 2 - 2.5, 18, 5);
          ctx.drawImage(sp.nozzle, 0, cy - 6, 26, 12);
        }
        ctx.restore();
      }
    }
  }

  /** One jet from nozzle (nx, cy) to the front at ex, firing towards `side`. */
  private drawJet(side: Side, alpha: number, nx: number, cy: number, ex: number, len: number, i: number, t: number) {
    const { ctx } = this;
    const sp = makeSprites();
    const droop = Math.min(20, 3 + len * 0.05);
    const ey = cy + droop;

    // soft cone of fine mist around the stream
    for (let k = 0; k < 5; k++) {
      const u = 0.22 + k * 0.19;
      const mx = nx + side * len * u;
      const my = cy + droop * u * u;
      const sz = 18 + 76 * u;
      ctx.globalAlpha = alpha * (0.07 + 0.025 * Math.sin(t * 9 + i * 2 + k));
      ctx.drawImage(sp.mist, mx - sz / 2, my - sz / 2, sz, sz);
    }

    // the stream itself: thin at the nozzle, fanning out and thinning as it breaks up
    ctx.globalAlpha = alpha;
    const N = 14;
    const topY: number[] = [];
    const botY: number[] = [];
    const px: number[] = [];
    for (let k = 0; k <= N; k++) {
      const u = k / N;
      const x = nx + side * len * u;
      const c = cy + droop * u * u + Math.sin(u * 11 - t * 36 + i * 2.3) * 0.9 * u;
      const hw = 0.9 + 4.4 * Math.pow(u, 1.35) + Math.sin(u * 17 - t * 41 + i) * 0.5 * u;
      px.push(x);
      topY.push(c - hw);
      botY.push(c + hw);
    }
    const g = ctx.createLinearGradient(nx, 0, ex, 0);
    g.addColorStop(0, `rgba(${WATER},0.95)`);
    g.addColorStop(0.5, `rgba(${WATER},0.5)`);
    g.addColorStop(0.9, `rgba(${WATER},0.1)`);
    g.addColorStop(1, `rgba(${WATER},0)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(px[0], topY[0]);
    for (let k = 1; k <= N; k++) ctx.lineTo(px[k], topY[k]);
    for (let k = N; k >= 0; k--) ctx.lineTo(px[k], botY[k]);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(6,40,50,0.14)";
    ctx.lineWidth = 0.6;
    ctx.stroke();

    // a streak racing along the stream
    ctx.strokeStyle = "rgba(255,255,255,0.55)";
    ctx.lineWidth = 0.8;
    ctx.setLineDash([9, 19]);
    ctx.lineDashOffset = -(t * 640 + i * 31);
    ctx.beginPath();
    ctx.moveTo(px[0], (topY[0] + botY[0]) / 2);
    for (let k = 1; k <= N - 3; k++) ctx.lineTo(px[k], (topY[k] + botY[k]) / 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // foam where it lands
    for (let k = 0; k < 3; k++) {
      const sz = 22 + k * 9 + Math.sin(t * 8 + i + k * 2) * 4;
      ctx.globalAlpha = alpha * (0.3 - k * 0.07);
      ctx.drawImage(sp.mist, ex - side * (10 + k * 7) - sz / 2, ey - 2 + Math.sin(t * 6 + i * 3 + k) * 6 - sz / 2, sz, sz);
    }
    ctx.globalAlpha = 1;
  }
}
