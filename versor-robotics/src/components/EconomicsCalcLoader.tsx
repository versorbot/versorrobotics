"use client";

import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import styles from "./EconomicsCalcLoader.module.css";

function Loading() {
  const t = useTranslations("economics");
  return (
    <div className={styles.loading} role="status">
      {t("loading")}
    </div>
  );
}

/** The calculator only reacts to its sliders, so it is never rendered on the server. */
const EconomicsCalc = dynamic(() => import("./EconomicsCalc"), { ssr: false, loading: Loading });

export default function EconomicsCalcLoader() {
  return <EconomicsCalc />;
}
