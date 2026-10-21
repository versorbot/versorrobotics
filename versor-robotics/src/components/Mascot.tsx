"use client";

import { useEffect, useState } from "react";
import { Bot, BotOff } from "lucide-react";
import { useTranslations } from "next-intl";
import RoverToy from "./RoverToy";
import styles from "./Mascot.module.css";

const OFF_KEY = "versor:mascot"; // localStorage: "off" once switched off with the toggle (remembered across visits)
const GONE_KEY = "versor:mascot-gone"; // sessionStorage: flicked away on a touch screen (back on the next visit)

// storage can be missing or throw (private windows, blocked site data): then the mascot simply shows
const read = (store: () => Storage, key: string) => {
  try {
    return store().getItem(key);
  } catch {
    return null;
  }
};
const write = (store: () => Storage, key: string, value: string | null) => {
  try {
    if (value === null) store().removeItem(key);
    else store().setItem(key, value);
  } catch {}
};

/**
 * The rover mascot and its on/off switch.
 *  - With a mouse: a small toggle in the bottom-left corner (CSS hides it on touch screens).
 *  - On a touch screen: flick the rover upwards and it flies away for the rest of the visit.
 * While it is off or gone, RoverToy is not mounted at all: no animation loop, no listeners, no three.js.
 */
export default function Mascot() {
  const t = useTranslations("rover");
  const [on, setOn] = useState<boolean | null>(null); // null until storage has been read in the browser
  const [gone, setGone] = useState(false);

  useEffect(() => {
    setOn(read(() => localStorage, OFF_KEY) !== "off");
    setGone(read(() => sessionStorage, GONE_KEY) === "1");
  }, []);

  if (on === null) return null;
  const shown = on && !gone;

  const toggle = () => {
    write(() => localStorage, OFF_KEY, shown ? "off" : null);
    if (!shown) {
      write(() => sessionStorage, GONE_KEY, null);
      setGone(false);
    }
    setOn(!shown);
  };

  const flewAway = () => {
    write(() => sessionStorage, GONE_KEY, "1");
    setGone(true);
  };

  const Icon = shown ? Bot : BotOff;
  return (
    <>
      {shown ? <RoverToy onFlyAway={flewAway} /> : null}
      <button type="button" className={styles.toggle} aria-pressed={shown} aria-label={t("toggle")} onClick={toggle}>
        <Icon size={20} strokeWidth={2.2} aria-hidden="true" />
        <span className={styles.tip} aria-hidden="true">
          {t("toggle")}
        </span>
      </button>
    </>
  );
}
