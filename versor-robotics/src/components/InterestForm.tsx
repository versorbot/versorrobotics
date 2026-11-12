"use client";

import { useRef, useState, type FormEvent } from "react";
import { Send } from "lucide-react";
import { useTranslations } from "next-intl";
import base from "./Contact.module.css";
import styles from "./InterestForm.module.css";
import { site } from "@/lib/site";

type Status = "idle" | "sending" | "sent" | "needCrop" | "needOther" | "error";

/** Google Forms' value for a ticked "Other" box; the text typed next to it goes in <entry>.other_option_response. */
const OTHER = "__other_option__";

/** The farmer & customer interest form (/interest). Posts straight into its Google Form, like ContactForm. */
export default function InterestForm() {
  const t = useTranslations("interest");
  const [status, setStatus] = useState<Status>("idle");
  const [other, setOther] = useState(false);
  const crops = useRef<HTMLFieldSetElement>(null);
  const { action, fields, crops: cropValues } = site.forms.interest;

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    if (data.get("company")) return; // honeypot: bots fill this, people never see it

    // Crop names are sent as the Google Form's own option text, whatever language the page is in.
    const picked = data.getAll("crops").map(String);
    const otherText = String(data.get("cropsOther") ?? "").trim();
    if (!picked.length) {
      setStatus("needCrop");
      crops.current?.querySelector("input")?.focus();
      return;
    }
    if (picked.includes(OTHER) && !otherText) {
      setStatus("needOther");
      form.querySelector<HTMLInputElement>("input[name='cropsOther']")?.focus();
      return;
    }

    setStatus("sending");
    try {
      const body = new URLSearchParams();
      body.append(fields.name, String(data.get("name") ?? "").trim());
      body.append(fields.email, String(data.get("email") ?? "").trim());
      body.append(fields.phone, String(data.get("phone") ?? "").trim());
      body.append(fields.location, String(data.get("location") ?? "").trim());
      for (const id of picked) body.append(fields.crops, id === OTHER ? OTHER : cropValues[id as keyof typeof cropValues]);
      if (picked.includes(OTHER)) body.append(`${fields.crops}.other_option_response`, otherText);
      body.append(fields.why, String(data.get("why") ?? "").trim());
      // Google Forms does not send CORS headers, so the reply is opaque; a thrown error means the request never left.
      await fetch(action, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      });
      form.reset();
      setOther(false);
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  }

  const optional = <small className={styles.optional}>{t("optional")}</small>;

  return (
    <form className={base.form} onSubmit={onSubmit}>
      <div className={base.two}>
        <label>
          <span>{t("name")}</span>
          <input name="name" type="text" required autoComplete="name" placeholder={t("namePlaceholder")} />
        </label>
        <label>
          <span>{t("phone")}</span>
          <input name="phone" type="tel" required autoComplete="tel" placeholder={t("phonePlaceholder")} />
        </label>
      </div>

      <label>
        <span>{t("email")}</span>
        <input name="email" type="email" required autoComplete="email" placeholder={t("emailPlaceholder")} />
      </label>

      <label>
        <span>
          {t("location")} {optional}
        </span>
        <input name="location" type="text" autoComplete="address-level2" placeholder={t("locationPlaceholder")} />
      </label>

      <fieldset ref={crops} className={styles.crops}>
        <legend>{t("crops")}</legend>
        <div className={styles.checks}>
          {(Object.keys(cropValues) as (keyof typeof cropValues)[]).map((id) => (
            <label key={id} className={styles.check}>
              <input type="checkbox" name="crops" value={id} onChange={() => status === "needCrop" && setStatus("idle")} />
              {t(`cropNames.${id}`)}
            </label>
          ))}
          <label className={styles.check}>
            <input
              type="checkbox"
              name="crops"
              value={OTHER}
              onChange={(e) => {
                setOther(e.currentTarget.checked);
                if (status === "needCrop") setStatus("idle");
              }}
            />
            {t("cropNames.other")}
          </label>
        </div>
        {other ? (
          <input name="cropsOther" type="text" aria-label={t("otherLabel")} placeholder={t("otherPlaceholder")} />
        ) : null}
      </fieldset>

      <label>
        <span>
          {t("why")} {optional}
        </span>
        <textarea name="why" rows={4} placeholder={t("whyPlaceholder")} />
      </label>

      {/* honeypot */}
      <input name="company" type="text" tabIndex={-1} autoComplete="off" aria-hidden="true" className={base.hp} />

      <div className={base.actions}>
        <button type="submit" className="btn btn--tomato" disabled={status === "sending"}>
          {status === "sending" ? t("sending") : t("send")}
          <Send size={16} aria-hidden="true" />
        </button>
        <p className={base.status} role="status" aria-live="polite">
          {status === "sent" && t("sent")}
          {status === "needCrop" && t("needCrop")}
          {status === "needOther" && t("needOther")}
          {status === "error" && t("error")}
        </p>
      </div>
    </form>
  );
}
