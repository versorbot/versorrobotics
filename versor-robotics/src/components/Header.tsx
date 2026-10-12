"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Menu, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import styles from "./Header.module.css";
import LanguagePicker from "./LanguagePicker";
import { RoverBot } from "./illustrations/Bots";
import { localePath, type Locale } from "@/i18n/routing";
import { nav } from "@/lib/site";

export default function Header() {
  const t = useTranslations("header");
  const tn = useTranslations("nav");
  // links carry the home path so they also work from other pages (/simulator); SmoothAnchors glides them on the home page
  const locale = useLocale() as Locale;
  const home = localePath(locale);
  const headerRef = useRef<HTMLElement>(null);
  const [active, setActive] = useState<string>("");
  const [open, setOpen] = useState(false);
  const [compact, setCompact] = useState<boolean | null>(null); // null until measured

  // Use the burger menu whenever the full nav does not fit on one line. Measured rather than a fixed breakpoint,
  // because the same nav is ~950px wide in English and ~1070px in Malayalam.
  useLayoutEffect(() => {
    const header = headerRef.current;
    const bar = header?.firstElementChild as HTMLElement | null;
    const logo = bar?.querySelector("a");
    const navEl = bar?.querySelector("nav");
    if (!header || !bar || !logo || !navEl) return;
    const fit = () => {
      header.setAttribute("data-measure", "");
      const cs = getComputedStyle(bar);
      const room = bar.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      const need = logo.offsetWidth + navEl.offsetWidth + 24;
      header.removeAttribute("data-measure");
      setCompact(need > room);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(bar);
    document.fonts?.ready.then(fit); // Indic fonts change the label widths once they arrive
    return () => ro.disconnect();
  }, [locale]);

  useEffect(() => {
    if (compact === false) setOpen(false);
  }, [compact]);

  // highlight the section whose wash has finished. Section offsets are measured on load and whenever the page
  // changes size; scrolling only compares them with scrollY, so it never forces a layout.
  useEffect(() => {
    let tops: [string, number][] = [];
    let raf = 0;
    const update = () => {
      raf = 0;
      const line = window.scrollY + window.innerHeight * 0.5;
      let current = "";
      for (const [id, top] of tops) if (top <= line) current = id;
      setActive(current);
    };
    const measure = () => {
      tops = [];
      for (const id of nav) {
        const el = document.getElementById(id);
        if (el) tops.push([id, el.getBoundingClientRect().top + window.scrollY]);
      }
      update();
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(document.body);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", measure);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <header
      ref={headerRef}
      className={styles.header}
      data-ready={compact === null ? undefined : ""}
      data-compact={compact ? "" : undefined}
    >
      <div className={`container ${styles.bar}`}>
        <a href={`${home}#top`} className={styles.logo} aria-label={t("home")}>
          <RoverBot className={styles.logoBot} />
          <span lang="en">Versor</span>
        </a>

        <nav className={styles.nav} aria-label={t("primary")}>
          {nav.map((id) => (
            <a key={id} href={`${home}#${id}`} className={active === id ? styles.active : undefined} aria-current={active === id ? "true" : undefined}>
              {tn(id)}
            </a>
          ))}
          <LanguagePicker />
          <a href={`${home}#contact`} className={`btn btn--tomato ${styles.cta}`}>
            {t("cta")}
          </a>
        </nav>

        <button
          type="button"
          className={styles.burger}
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? t("closeMenu") : t("openMenu")}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      <nav id="mobile-nav" className={`${styles.panel} ${open ? styles.panelOpen : ""}`} aria-label={t("mobile")}>
        {nav.map((id) => (
          <a key={id} href={`${home}#${id}`} onClick={() => setOpen(false)}>
            {tn(id)}
          </a>
        ))}
        <LanguagePicker className={styles.panelPicker} onPick={() => setOpen(false)} />
        <a href={`${home}#contact`} className="btn btn--tomato" onClick={() => setOpen(false)}>
          {t("cta")}
        </a>
      </nav>
    </header>
  );
}
