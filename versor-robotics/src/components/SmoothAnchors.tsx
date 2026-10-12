"use client";

import { useEffect } from "react";
import { WASH_SPAN, WASH_TOP, clamp, readViewport } from "@/lib/wash";

/**
 * Makes in-page links (#vision, #contact …) glide instead of jumping, and paces the glide around the spray wash:
 * quick between sections, then slowing down so the wash that reveals the section you asked for plays out in about
 * a second and a half. Going down that is the section's own wash; going back up it is the (mirrored) wash of the
 * section after it. Any wheel / touch / key press hands control straight back to the visitor.
 */
export default function SmoothAnchors() {
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    let stop: (() => void) | null = null;

    const glide = (y1: number, dest: Element | null) => {
      stop?.();
      const vh = readViewport().svh; // the same stable height the wash is measured in
      // the furthest the page can scroll right now (real viewport, not the stable one)
      y1 = clamp(y1, 0, Math.max(0, document.documentElement.scrollHeight - window.innerHeight));
      let y = window.scrollY;
      if (Math.abs(y1 - y) < 2) return;
      if (reduce.matches) {
        window.scrollTo({ top: y1, behavior: "instant" });
        return;
      }

      const dir = y1 > y ? 1 : -1;
      const lo = Math.min(y, y1);
      const hi = Math.max(y, y1);
      // where each wash plays, in page coordinates
      const chapters = Array.from(document.querySelectorAll<HTMLElement>("[data-chapter]"));
      const reveals = dest ? chapters[chapters.indexOf(dest as HTMLElement) + (dir > 0 ? 0 : 1)] : undefined;
      const zones = chapters
        .map((el) => {
          const a = el.getBoundingClientRect().top + window.scrollY - vh * WASH_TOP;
          return { a, b: a + vh * WASH_SPAN, dest: el === reveals };
        })
        .filter((z) => z.b > lo && z.a < hi);

      const CRUISE = vh * 4.5; // px/s between washes
      const MID = vh * 2.4; // through a wash we are only passing
      const DEST = (vh * WASH_SPAN) / 1.3; // the wash we came for: ~1.3 s
      const ACC = vh * 8;
      const DEC = vh * 8;

      let v = 0;
      let last = performance.now();
      let raf = 0;
      let done = false;

      const end = (snap: boolean) => {
        if (done) return;
        done = true;
        cancelAnimationFrame(raf);
        for (const ev of ["wheel", "touchstart", "keydown", "pointerdown"] as const) window.removeEventListener(ev, onUser);
        if (snap) window.scrollTo({ top: y1, behavior: "instant" });
        stop = null;
      };
      const onUser = () => end(false);
      for (const ev of ["wheel", "touchstart", "keydown", "pointerdown"] as const) window.addEventListener(ev, onUser, { passive: true });
      stop = () => end(false);

      const step = (now: number) => {
        if (done) return;
        const dt = Math.min(0.1, Math.max(0.001, (now - last) / 1000));
        last = now;
        const rem = (y1 - y) * dir;
        if (rem <= 0.6) {
          end(true);
          return;
        }
        // speed we may carry here: cruise, but slow down in time for every wash still ahead of us
        let allowed = CRUISE;
        for (const z of zones) {
          const behind = dir > 0 ? y > z.b : y < z.a;
          if (behind) continue;
          const d = dir > 0 ? Math.max(0, z.a - y) : Math.max(0, y - z.b);
          allowed = Math.min(allowed, (z.dest ? DEST : MID) + Math.sqrt(2 * DEC * d));
        }
        const target = Math.min(allowed, 4.5 * rem + 14);
        v = target > v ? Math.min(target, v + ACC * dt) : Math.max(target, v - DEC * 1.4 * dt);
        y += dir * Math.min(v * dt, rem);
        window.scrollTo({ top: y, behavior: "instant" });
        // the page would not go there (it got shorter, or something else moved it): stop rather than spin
        if (Math.abs(window.scrollY - y) > 2) {
          end(false);
          return;
        }
        raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    };

    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      // "#vision" or a full link back to this page ("/hi#vision"); links to another page navigate normally
      const a = (e.target as Element | null)?.closest?.("a[href*='#']") as HTMLAnchorElement | null;
      if (!a || (a.target && a.target !== "_self")) return;
      const url = new URL(a.href);
      if (url.origin !== location.origin || url.pathname !== location.pathname || url.search !== location.search) return;
      const hash = url.hash;
      if (hash.length < 2) return;
      const el = document.getElementById(decodeURIComponent(hash.slice(1)));
      if (!el) return;
      e.preventDefault();
      glide(el.getBoundingClientRect().top + window.scrollY, el.closest("[data-chapter]"));
      history.pushState(null, "", hash);
    };

    document.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("click", onClick);
      stop?.();
    };
  }, []);

  return null;
}
