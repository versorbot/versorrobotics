"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Droplets, Sprout } from "lucide-react";
import { useTranslations } from "next-intl";
import Chapter from "./Chapter";
import styles from "./Game.module.css";
import { kicker, rich } from "@/i18n/rich";
import { FieldRun, GAME_H, GAME_W, type Hud, type Phase } from "@/lib/fieldRun";
import { C } from "@/lib/palette";

const pad = (n: number) => String(Math.max(0, Math.floor(n))).padStart(5, "0");

/**
 * FIELD RUN: the arcade cabinet at the bottom of the page.
 * Keys only steer the game while it is on screen and being played, so typing in the contact form is never hijacked.
 */
export default function Game() {
  const t = useTranslations("game");
  const tn = useTranslations("nav");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<FieldRun | null>(null);
  const scoreRef = useRef<HTMLSpanElement>(null);
  const bestRef = useRef<HTMLSpanElement>(null);
  const seedsRef = useRef<HTMLSpanElement>(null);
  const speedRef = useRef<HTMLSpanElement>(null);
  const tankRef = useRef<HTMLSpanElement>(null);
  const tankStatRef = useRef<HTMLDivElement>(null);
  const hudRef = useRef<Hud>({ score: 0, best: 0, speed: 0, seeds: 0, tank: 1, dry: false });
  const [phase, setPhase] = useState<Phase>("ready");
  const [coarse, setCoarse] = useState(false);
  const [result, setResult] = useState({ score: 0, best: 0, fresh: false });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setCoarse(window.matchMedia("(pointer: coarse)").matches);
    let prevBest = 0;
    const game = new FieldRun(canvas, {
      onPhase: (p) => {
        setPhase(p);
        if (p === "crashed") {
          const h = hudRef.current;
          setResult({ score: h.score, best: h.best, fresh: h.score > 0 && h.score >= h.best && h.best > prevBest });
          prevBest = h.best;
        }
      },
      onHud: (h) => {
        hudRef.current = h;
        if (scoreRef.current) scoreRef.current.textContent = pad(h.score);
        if (bestRef.current) bestRef.current.textContent = pad(h.best);
        if (seedsRef.current) seedsRef.current.textContent = String(h.seeds);
        if (speedRef.current) speedRef.current.style.width = `${Math.round(8 + h.speed * 92)}%`;
        if (tankRef.current) tankRef.current.style.width = `${Math.round(h.tank * 100)}%`;
        tankStatRef.current?.toggleAttribute("data-dry", h.dry);
      },
    });
    prevBest = hudRef.current.best;
    gameRef.current = game;

    const fit = () => {
      const r = canvas.getBoundingClientRect();
      if (r.width > 0) game.resize(r.width, Math.min(window.devicePixelRatio || 1, 2));
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(canvas);

    // run only while the cabinet is on screen
    let raf = 0;
    let last = 0;
    let active = false; // mostly in view: keys steer the game
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
      last = now;
      game.frame(dt);
    };
    const io = new IntersectionObserver(
      ([e]) => {
        active = e.intersectionRatio >= 0.45;
        if (e.isIntersecting) {
          if (!raf) {
            last = performance.now();
            raf = requestAnimationFrame(loop);
          }
        } else if (raf) {
          cancelAnimationFrame(raf);
          raf = 0;
        }
        if (e.intersectionRatio < 0.3) game.pause();
      },
      { threshold: [0, 0.3, 0.45, 0.7] },
    );
    io.observe(canvas);

    const typing = (t: EventTarget | null) => {
      const el = t as HTMLElement | null;
      return !!el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (!active || e.ctrlKey || e.metaKey || e.altKey || typing(e.target)) return;
      const k = e.key.toLowerCase();
      if (k === "enter") {
        const t = e.target as HTMLElement | null;
        if (t && /^(BUTTON|A)$/.test(t.tagName)) return; // let a focused button/link do its own thing
        if (game.phase !== "playing") {
          e.preventDefault();
          game.primary();
        }
        return;
      }
      if (game.phase !== "playing") return;
      switch (k) {
        case "arrowup":
        case "w":
          e.preventDefault();
          if (!e.repeat) game.changeLane(-1);
          break;
        case "arrowdown":
        case "s":
          e.preventDefault();
          if (!e.repeat) game.changeLane(1);
          break;
        case "arrowright":
        case "d":
          e.preventDefault();
          game.setBoost(1);
          break;
        case "arrowleft":
        case "a":
          e.preventDefault();
          game.setBoost(-1);
          break;
        case " ":
        case "j":
          e.preventDefault(); // Space would scroll the page
          if (!e.repeat) game.setSpray(true);
          break;
        case "p":
        case "escape":
          game.pause();
          break;
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === "arrowright" || k === "d" || k === "arrowleft" || k === "a") game.setBoost(0);
      if (k === " " || k === "j") game.setSpray(false);
    };
    const onBlur = () => {
      game.setBoost(0);
      game.setSpray(false);
      game.pause();
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);

    // swipe up / down on the screen (touch) to change lane
    let sx = 0;
    let sy = 0;
    const onPointerDown = (e: PointerEvent) => {
      sx = e.clientX;
      sy = e.clientY;
    };
    const onPointerUp = (e: PointerEvent) => {
      if (game.phase !== "playing") return;
      const dx = e.clientX - sx;
      const dy = e.clientY - sy;
      if (Math.abs(dy) > 24 && Math.abs(dy) > Math.abs(dx)) game.changeLane(dy < 0 ? -1 : 1);
      else if (e.pointerType === "touch") {
        const r = canvas.getBoundingClientRect();
        game.changeLane(e.clientY < r.top + r.height / 2 ? -1 : 1);
      }
    };
    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointerup", onPointerUp);

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointerup", onPointerUp);
      gameRef.current = null;
    };
  }, []);

  const go = () => gameRef.current?.primary();
  const hold = (b: -1 | 0 | 1) => () => gameRef.current?.setBoost(b);
  const lane = (d: -1 | 1) => () => gameRef.current?.changeLane(d);
  const spray = (on: boolean) => () => gameRef.current?.setSpray(on);

  return (
    <Chapter id="play" label={tn("play")} prev={C.ink} bg={C.steel} dot="rgba(0,0,0,0.08)">
      <div className="container">
        <div className={styles.head}>
          <p className="kicker">{kicker(7, tn("play"))}</p>
          <h2 className="title" style={{ fontSize: "clamp(2.1rem, 5vw, 3.9rem)" }}>
            {t.rich("title", rich)}
          </h2>
        </div>

        <div className={styles.cabinet} data-rover-avoid="">
          <div className={styles.marquee} aria-hidden="true">
            <span>{t("player")}</span>
            <strong>{t("cabinet")}</strong>
            <span>{t("insert")}</span>
          </div>

          <div className={styles.screen}>
            <canvas
              ref={canvasRef}
              className={`${styles.canvas} ${phase === "playing" ? styles.live : ""}`}
              width={GAME_W}
              height={GAME_H}
              role="img"
              aria-label={t("canvas")}
            />

            <div className={styles.hud} aria-live="off">
              <div className={styles.stat}>
                <span className={styles.label}>{t("score")}</span>
                <span ref={scoreRef} className={styles.value} lang="en">
                  00000
                </span>
              </div>
              <div className={styles.stat}>
                <span className={styles.label}>
                  <Sprout size={13} aria-hidden="true" /> {t("seeds")}
                </span>
                <span ref={seedsRef} className={styles.value} lang="en">
                  0
                </span>
              </div>
              <div ref={tankStatRef} className={`${styles.stat} ${styles.tank}`}>
                <span className={styles.label}>
                  <Droplets size={13} aria-hidden="true" /> {t("tank")}
                </span>
                <i className={styles.tankBar}>
                  <span ref={tankRef} />
                </i>
              </div>
              <div className={`${styles.stat} ${styles.right}`}>
                <span className={styles.label}>{t("best")}</span>
                <span ref={bestRef} className={styles.value} lang="en">
                  00000
                </span>
              </div>
            </div>
            <div className={styles.speed} aria-hidden="true">
              <span className={styles.label}>{t("speed")}</span>
              <i>
                <span ref={speedRef} />
              </i>
            </div>

            {phase !== "playing" ? (
              <div className={`${styles.overlay} ${phase === "crashed" ? styles.dock : ""}`}>
                <div className={styles.card} role="dialog" aria-label={phase === "crashed" ? t("crashedTitle") : phase === "paused" ? t("pausedTitle") : t("readyTitle")}>
                  {phase === "ready" ? (
                    <>
                      <p className={styles.cardKicker}>{t("readyKicker")}</p>
                      <h3>{t("readyTitle")}</h3>
                      <p>{t("readyText")}</p>
                    </>
                  ) : null}
                  {phase === "crashed" ? (
                    <>
                      <p className={`${styles.cardKicker} ${styles.bad}`}>{t("crashedKicker")}</p>
                      <h3>{t("crashedTitle")}</h3>
                      <p className={styles.result}>
                        {t.rich("result", { score: pad(result.score), best: pad(result.best), b: (c) => <b lang="en">{c}</b> })}
                      </p>
                      {result.fresh ? <p className={styles.fresh}>{t("newBest")}</p> : null}
                    </>
                  ) : null}
                  {phase === "paused" ? (
                    <>
                      <p className={styles.cardKicker}>{t("pausedKicker")}</p>
                      <h3>{t("pausedTitle")}</h3>
                    </>
                  ) : null}
                  <button type="button" className="btn btn--amber" onClick={go}>
                    {phase === "ready"
                      ? t(coarse ? "tapStart" : "keyStart")
                      : phase === "paused"
                        ? t(coarse ? "tapResume" : "keyResume")
                        : t(coarse ? "tapAgain" : "keyAgain")}
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          {/* on-screen controls for touch devices */}
          <div className={styles.touch} aria-hidden="true" onContextMenu={(e) => e.preventDefault()}>
            <div>
              <button type="button" onPointerDown={lane(-1)} tabIndex={-1}>
                <ArrowUp size={20} />
                <span>{t("touchUp")}</span>
              </button>
              <button type="button" onPointerDown={lane(1)} tabIndex={-1}>
                <ArrowDown size={20} />
                <span>{t("touchDown")}</span>
              </button>
            </div>
            <div>
              <button
                type="button"
                className={styles.spray}
                onPointerDown={spray(true)}
                onPointerUp={spray(false)}
                onPointerLeave={spray(false)}
                onPointerCancel={spray(false)}
                tabIndex={-1}
              >
                <Droplets size={20} />
                <span>{t("touchSpray")}</span>
              </button>
              <button type="button" onPointerDown={hold(-1)} onPointerUp={hold(0)} onPointerLeave={hold(0)} onPointerCancel={hold(0)} tabIndex={-1}>
                <ArrowLeft size={20} />
                <span>{t("touchBrake")}</span>
              </button>
              <button type="button" onPointerDown={hold(1)} onPointerUp={hold(0)} onPointerLeave={hold(0)} onPointerCancel={hold(0)} tabIndex={-1}>
                <ArrowRight size={20} />
                <span>{t("touchBoost")}</span>
              </button>
            </div>
          </div>

          <ul className={styles.keys} aria-label={t("controls")}>
            <li>
              <kbd lang="en">W</kbd>
              <kbd lang="en">&uarr;</kbd> {t("keyUp")}
            </li>
            <li>
              <kbd lang="en">S</kbd>
              <kbd lang="en">&darr;</kbd> {t("keyDown")}
            </li>
            <li>
              <kbd lang="en">D</kbd>
              <kbd lang="en">&rarr;</kbd> {t("keyBoost")}
            </li>
            <li>
              <kbd lang="en">A</kbd>
              <kbd lang="en">&larr;</kbd> {t("keyBrake")}
            </li>
            <li>
              <kbd className={styles.wide} lang="en">Space</kbd>
              <kbd lang="en">J</kbd> {t("keySpray")}
            </li>
            <li>
              <kbd className={styles.wide} lang="en">Enter</kbd> {t("keyRestart")}
            </li>
          </ul>
        </div>
        <p className={styles.rotate}>{t("rotate")}</p>
      </div>
    </Chapter>
  );
}
