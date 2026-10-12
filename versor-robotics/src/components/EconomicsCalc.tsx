"use client";

import "@fontsource/syne/600.css";
import "@fontsource/syne/700.css";
import "@fontsource/dm-mono/400.css";
import "@fontsource/dm-mono/500.css";
import "@fontsource/instrument-sans/400.css";
import "@fontsource/instrument-sans/500.css";
import "@fontsource/instrument-sans/600.css";
import "@fontsource/instrument-sans/700.css";
import { Fragment, useState } from "react";
import styles from "./EconomicsCalc.module.css";

/*
 * Unit economics calculator (a 1:1 port of reference/versor-unit-economics.html).
 * The formulas, defaults, rounding, formatters and labels are the reference's own; only the styling changed.
 * Its labels stay in English on every language. Loaded client-only from EconomicsCalcLoader.
 * data-out / data-tone exist so scripts can compare every output with the reference page.
 */

const fmt = (n: number, c = false) => {
  if (c) {
    if (n >= 10000000) return "₹" + (n / 10000000).toFixed(1) + "Cr";
    if (n >= 100000) return "₹" + (n / 100000).toFixed(1) + "L";
    if (n >= 1000) return "₹" + Math.round(n / 1000) + "K";
    return "₹" + Math.round(n);
  }
  return "₹" + Math.round(n).toLocaleString("en-IN");
};
const pct = (n: number) => (n * 100).toFixed(1) + "%";
const xf = (n: number) => n.toFixed(1) + "x";
const mof = (n: number) => n.toFixed(1) + " mo";

type Key = "days" | "farms" | "acres" | "rate" | "sprays" | "build" | "opex" | "sale" | "sla" | "rpc" | "cac" | "ltv";
type Values = Record<Key, number>;
type Tone = "green" | "amber" | "red" | "blue";
type Mode = "both" | "direct" | "raas";

interface Slider {
  key: Key;
  name: string;
  min: number;
  max: number;
  step: number;
  value: number;
  lo: string;
  hi: string;
  show: (v: number) => string;
  divider?: boolean; // a rule above this slider
}

// OpEx and CAC defaults sit off their step grid on purpose (as in the reference): the state keeps the exact
// figure until the slider is moved, while the browser draws the thumb at the nearest step.
const SLIDERS: Slider[] = [
  { key: "days", name: "Working days / year", min: 100, max: 300, step: 10, value: 200, lo: "100d", hi: "300d", show: (v) => v + " days" },
  { key: "farms", name: "Farms served per day", min: 1, max: 8, step: 1, value: 4, lo: "1", hi: "8", show: (v) => v + " farms" },
  { key: "acres", name: "Avg farm size (acres)", min: 1, max: 10, step: 0.5, value: 2, lo: "1", hi: "10", show: (v) => v + " acres" },
  { key: "rate", name: "RaaS rate (₹/acre/spray)", min: 200, max: 800, step: 25, value: 400, lo: "₹200", hi: "₹800", show: (v) => "₹" + v },
  { key: "sprays", name: "Sprays per season (pricing)", min: 4, max: 20, step: 1, value: 10, lo: "4", hi: "20", show: (v) => String(v) },
  { key: "build", name: "Robot build cost (₹)", min: 300000, max: 900000, step: 10000, value: 700000, lo: "₹3L", hi: "₹9L", show: (v) => fmt(v, true), divider: true },
  { key: "opex", name: "OpEx / robot / year (₹)", min: 40000, max: 300000, step: 5000, value: 111000, lo: "₹40K", hi: "₹3L", show: (v) => fmt(v, true) },
  { key: "sale", name: "Sale price per robot (₹)", min: 500000, max: 2000000, step: 50000, value: 1000000, lo: "₹5L", hi: "₹20L", show: (v) => fmt(v, true), divider: true },
  { key: "sla", name: "Annual SLA fee / robot (₹)", min: 10000, max: 150000, step: 5000, value: 50000, lo: "₹10K", hi: "₹1.5L", show: (v) => fmt(v, true) },
  { key: "rpc", name: "Avg robots per customer", min: 1, max: 10, step: 1, value: 2, lo: "1", hi: "10", show: (v) => v + " robots" },
  { key: "cac", name: "CAC per customer (₹)", min: 20000, max: 500000, step: 10000, value: 114000, lo: "₹20K", hi: "₹5L", show: (v) => fmt(v, true) },
  { key: "ltv", name: "LTV horizon (years)", min: 1, max: 10, step: 1, value: 5, lo: "1yr", hi: "10yr", show: (v) => v + " yrs" },
];

const DEFAULTS = Object.fromEntries(SLIDERS.map((s) => [s.key, s.value])) as Values;

type BarKind = "rev" | "opex" | "dep" | "cm";
interface WfRow {
  label: string;
  width: string;
  text: string;
  kind: BarKind;
}

function wfBar(label: string, amount: number, maxAmt: number, kind: BarKind): WfRow {
  const w = Math.max(2, Math.min(100, (Math.abs(amount) / maxAmt) * 100));
  const text = amount < 0 ? "(" + fmt(Math.abs(amount), true) + ")" : fmt(amount, true);
  return { label, width: w.toFixed(1) + "%", text, kind };
}

/** Everything calc() in the reference computes, as data. */
function compute(v: Values) {
  const { days, farms, acres, rate, sprays, build, opex, sale, sla, rpc, cac } = v;
  const ltvYrs = v.ltv;

  // RaaS — corrected formula
  const acresDay = farms * acres;
  const rev = acresDay * rate * days;
  const dep = build / 5;
  const cm = rev - opex - dep;
  const cmPct = rev > 0 ? cm / rev : 0;
  const pb = rev - opex > 0 ? (build / (rev - opex)) * 12 : 999;

  // Sanity check
  const revPerFarmer = acres * rate * sprays * 2;
  const uniqueFarmers = (days * farms) / (sprays * 2);
  const crossCheck = uniqueFarmers * revPerFarmer;

  // Direct sale
  const gp_init = sale - build;
  const gm_init = gp_init / sale;
  const gm_scale = (sale - build * 0.7) / sale;
  const ltv_hw = sale * rpc;
  const ltv_sla = sla * rpc * ltvYrs;
  const ltv = ltv_hw + ltv_sla;
  const ltvcac = ltv / cac;

  const pbTone: Tone = pb < 12 ? "green" : pb < 24 ? "amber" : "red";
  const out = {
    gmInit: { text: pct(gm_init), tone: (gm_init >= 0.3 ? "green" : gm_init > 0 ? "amber" : "red") as Tone },
    cm: { text: pct(cmPct), tone: (cmPct >= 0.5 ? "green" : cmPct > 0 ? "amber" : "red") as Tone },
    payback: { text: pb < 24 ? mof(pb) : ">24 mo", tone: pbTone },

    gp: { text: fmt(gp_init, true), tone: (gp_init >= 0 ? "green" : "red") as Tone },
    gm: { text: pct(gm_init) + " → " + pct(gm_scale), tone: (gm_init >= 0.3 ? "green" : "amber") as Tone },
    ltv: { text: fmt(ltv, true) },
    ltvcac: { text: xf(ltvcac), tone: (ltvcac >= 5 ? "green" : ltvcac >= 3 ? "amber" : "red") as Tone },

    acresDay: { text: acresDay.toFixed(1) + " acres" },
    rev: { text: fmt(rev, true), tone: (rev > opex + dep ? "amber" : "red") as Tone },
    cm2: { text: fmt(cm, true), tone: (cm > 0 ? "green" : "red") as Tone },
    pb2: { text: pb < 999 ? mof(pb) : "N/A", tone: pbTone },
  };

  const maxDS = ltv;
  const wfDirect = [
    wfBar("Hardware revenue (" + rpc + " robots)", ltv_hw, maxDS, "rev"),
    wfBar("SLA revenue (" + ltvYrs + " yrs × " + rpc + ")", ltv_sla, maxDS, "cm"),
    wfBar("CAC (acquisition cost)", cac, maxDS, "opex"),
    wfBar("Net LTV after CAC", ltv - cac, maxDS, "cm"),
  ];
  const wfRaas = [
    wfBar("Revenue (spraying service)", rev, rev, "rev"),
    wfBar("OpEx (maintenance, ops, transport)", opex, rev, "opex"),
    wfBar("Depreciation (robot ÷ 5 yrs)", dep, rev, "dep"),
    wfBar("Contribution margin", Math.max(0, cm), rev, "cm"),
  ];

  // Cash flow chart
  const net = rev - opex;
  const cfs = [0, 1, 2, 3, 4, 5].map((y) => (y === 0 ? -build : -build + net * y));
  const maxA = Math.max(...cfs.map(Math.abs));
  const chart = cfs.map((cf) => {
    const h = Math.max(4, Math.round((Math.abs(cf) / maxA) * 70));
    return { neg: cf < 0, h, gap: cf < 0 ? 70 - h : 0 };
  });

  return {
    out,
    wfDirect,
    wfRaas,
    chart,
    rev,
    acresDay,
    revPerFarmer,
    uniqueFarmers,
    crossCheck,
    ok: Math.abs(crossCheck - rev) < 1,
  };
}

const TABS: { mode: Mode; label: string }[] = [
  { mode: "both", label: "Both Models" },
  { mode: "direct", label: "Direct Sale" },
  { mode: "raas", label: "RaaS Only" },
];

const chartLabel = (n: number) =>
  `Cumulative cash flow per robot for years 0 to ${n - 1}; red bars are below zero, green bars above`;

function Waterfall({ rows, name }: { rows: WfRow[]; name: string }) {
  return (
    <div data-out={name}>
      {rows.map((r) => (
        <div key={r.label} className={styles.wfRow}>
          <span className={styles.wfLbl}>{r.label}</span>
          <div className={styles.wfBarWrap}>
            <div className={`${styles.wfBar} ${styles[`wf-${r.kind}`]}`} style={{ width: r.width }} data-bar="">
              <span>{r.text}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/** One metric / summary value; `tone` picks the green / amber / red / blue colour. */
function Val({ name, text, tone, className }: { name: string; text: string; tone?: Tone; className: string }) {
  return (
    <div className={`${className} ${tone ? styles[tone] : ""}`} data-out={name} data-tone={tone ?? ""}>
      {text}
    </div>
  );
}

export default function EconomicsCalc() {
  const [values, setValues] = useState<Values>(DEFAULTS);
  const [mode, setMode] = useState<Mode>("both");
  const r = compute(values);
  const { out } = r;
  const { days, farms, acres, rate, sprays, build } = values;

  return (
    <div className={styles.econ} lang="en" data-rover-avoid="">
      <div className={styles.page}>
        <div className={styles.top}>
          <div>
            <h2>Unit Economics Calculator</h2>
            <p>Versor Robotics · Corrected model · Revenue = farms/day × acres/farm × rate × working days</p>
          </div>
          <div className={styles.tabs} role="group" aria-label="Business model">
            {TABS.map((t) => (
              <button
                key={t.mode}
                type="button"
                className={`${styles.tab} ${mode === t.mode ? styles.active : ""}`}
                aria-pressed={mode === t.mode}
                data-mode={t.mode}
                onClick={() => setMode(t.mode)}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.layout}>
          <div className={styles.sliders}>
            <div className={styles.panelTitle}>Parameters</div>

            {SLIDERS.map((s) => (
              <Fragment key={s.key}>
                {s.divider ? <div className={styles.dividerSm} /> : null}
                <div className={styles.sliderGroup}>
                  <div className={styles.sgLabel}>
                    <span className={styles.sgName}>{s.name}</span>
                    <span className={styles.sgVal} data-out={`v-${s.key}`}>
                      {s.show(values[s.key])}
                    </span>
                  </div>
                  <input
                    type="range"
                    className={styles.range}
                    data-slider={s.key}
                    min={s.min}
                    max={s.max}
                    step={s.step}
                    value={values[s.key]}
                    aria-label={s.name}
                    aria-valuetext={s.show(values[s.key])}
                    onChange={(e) => {
                      const n = parseFloat(e.currentTarget.value);
                      setValues((prev) => ({ ...prev, [s.key]: n }));
                    }}
                  />
                  <div className={styles.sgRange} aria-hidden="true">
                    <span>{s.lo}</span>
                    <span>{s.hi}</span>
                  </div>
                </div>
              </Fragment>
            ))}

            <div className={styles.formulaNote} data-out="formula-note">
              <strong className={styles.noteHead}>Revenue formula</strong>
              <br />
              {`${farms} farms × ${acres} ac × ₹${rate} × ${days} days = `}
              <strong className={styles.noteVal}>{fmt(r.rev, true)}</strong>
              <br />
              {`100-unit batch cost = ${fmt(build * 0.7, true)} (30% off)`}
            </div>
          </div>

          <div className={styles.results}>
            <div className={styles.banner}>
              <div className={styles.sbItem}>
                <div className={styles.sbLabel}>Gross margin (initial)</div>
                <Val className={styles.sbVal} name="r-gm-init" {...out.gmInit} />
                <div className={styles.sbSub}>on direct sale</div>
              </div>
              <div className={styles.sbItem}>
                <div className={styles.sbLabel}>RaaS contribution margin</div>
                <Val className={styles.sbVal} name="r-cm" {...out.cm} />
                <div className={styles.sbSub}>revenue minus all costs</div>
              </div>
              <div className={styles.sbItem}>
                <div className={styles.sbLabel}>Asset payback</div>
                <Val className={styles.sbVal} name="r-payback" {...out.payback} />
                <div className={styles.sbSub}>months to recover robot cost</div>
              </div>
            </div>

            <section
              className={`${styles.block} ${styles.blockDirect} ${mode === "raas" ? styles.hidden : ""}`}
              data-out="block-direct"
              aria-label="Direct Sale"
            >
              <div className={styles.modelHdr}>
                <span className={`${styles.badge} ${styles.badgeTeal}`}>Direct Sale</span>
                <span className={styles.modelTitle}>Large Farms &amp; FPOs — Ownership Model</span>
              </div>
              <div className={styles.metrics}>
                <div className={styles.metric}>
                  <div className={styles.metricLbl}>Gross profit / robot</div>
                  <Val className={styles.metricVal} name="r-gp" {...out.gp} />
                  <div className={styles.metricSub}>initial batch</div>
                </div>
                <div className={styles.metric}>
                  <div className={styles.metricLbl}>Gross margin</div>
                  <Val className={styles.metricVal} name="r-gm" {...out.gm} />
                  <div className={styles.metricSub}>initial → 100-unit batch</div>
                </div>
                <div className={styles.metric}>
                  <div className={styles.metricLbl}>Total LTV / customer</div>
                  <Val className={styles.metricVal} name="r-ltv" {...out.ltv} />
                  <div className={styles.metricSub}>hardware + SLA</div>
                </div>
                <div className={styles.metric}>
                  <div className={styles.metricLbl}>LTV : CAC</div>
                  <Val className={styles.metricVal} name="r-ltvcac" {...out.ltvcac} />
                  <div className={styles.metricSub}>target &gt;3x</div>
                </div>
              </div>
              <div className={styles.waterfall}>
                <div className={styles.wfTitle}>Revenue per customer breakdown</div>
                <Waterfall rows={r.wfDirect} name="wf-direct" />
              </div>
            </section>

            <section
              className={`${styles.block} ${styles.blockRaas} ${mode === "direct" ? styles.hidden : ""}`}
              data-out="block-raas"
              aria-label="RaaS"
            >
              <div className={styles.modelHdr}>
                <span className={`${styles.badge} ${styles.badgeAmber}`}>RaaS</span>
                <span className={styles.modelTitle}>Small &amp; Marginal Farmers — Robot as a Service</span>
              </div>
              <div className={styles.metrics}>
                <div className={styles.metric}>
                  <div className={styles.metricLbl}>Acres served / day</div>
                  <Val className={styles.metricVal} name="r-acres-day" {...out.acresDay} />
                  <div className={styles.metricSub}>farms × avg size</div>
                </div>
                <div className={styles.metric}>
                  <div className={styles.metricLbl}>Revenue / robot / yr</div>
                  <Val className={styles.metricVal} name="r-rev" {...out.rev} />
                  <div className={styles.metricSub}>acres/day × rate × days</div>
                </div>
                <div className={styles.metric}>
                  <div className={styles.metricLbl}>Contribution margin/yr</div>
                  <Val className={styles.metricVal} name="r-cm2" {...out.cm2} />
                  <div className={styles.metricSub}>after opex + depreciation</div>
                </div>
                <div className={styles.metric}>
                  <div className={styles.metricLbl}>Asset payback</div>
                  <Val className={styles.metricVal} name="r-pb2" {...out.pb2} />
                  <div className={styles.metricSub}>months</div>
                </div>
              </div>
              <div className={styles.waterfall}>
                <div className={styles.wfTitle}>Per-robot annual P&amp;L waterfall</div>
                <Waterfall rows={r.wfRaas} name="wf-raas" />
              </div>
              <div className={`${styles.wfTitle} ${styles.chartTitle}`}>Cumulative cash flow — 5 years</div>
              <div className={styles.chart} data-out="chart-payback" role="img" aria-label={chartLabel(r.chart.length)}>
                {r.chart.map((b, i) => (
                  <div key={i} className={styles.barCol}>
                    <div style={{ height: b.gap + "px" }} data-gap="" />
                    <div className={`${styles.b} ${b.neg ? styles.bNeg : styles.bPos}`} style={{ height: b.h + "px" }} data-bar="" />
                    <span className={styles.bl}>Y{i}</span>
                  </div>
                ))}
              </div>
              <div className={styles.sanity} data-out="sanity-box">
                <strong className={styles.noteHead}>Farmer-side sanity check</strong>
                <br />
                {`Each farmer (${acres} ac): ${acres} × ₹${rate} × ${sprays} sprays × 2 seasons = `}
                <span>{fmt(r.revPerFarmer, true)}/yr</span>
                <br />
                {`Unique farmers/yr: ${days}d × ${farms} farms ÷ (${sprays} × 2 seasons) = `}
                <span>{Math.round(r.uniqueFarmers)} farmers</span>
                <br />
                {"Cross-check: "}
                <span>{Math.round(r.uniqueFarmers)}</span>
                {" × "}
                <span>{fmt(r.revPerFarmer, true)}</span>
                {" = "}
                <span>{fmt(r.crossCheck, true)}</span>{" "}
                {r.ok ? (
                  <span className={styles.ok} data-tone="green">
                    ✓ matches revenue above
                  </span>
                ) : (
                  <span className={styles.bad} data-tone="red">
                    ✗ mismatch — check inputs
                  </span>
                )}
              </div>
            </section>

            <p className={styles.note} data-out="bottom-note">
              {`Revenue = acres/day (${r.acresDay}) × ₹${rate}/spray × ${days} days. Sprays per season is used only in the farmer sanity check — not in the fleet revenue formula.`}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

