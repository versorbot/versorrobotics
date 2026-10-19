"use client";

import { useState, type FormEvent } from "react";
import { Send } from "lucide-react";
import { useTranslations } from "next-intl";
import styles from "./Contact.module.css";
import { contact, site } from "@/lib/site";

type Status = "idle" | "sending" | "sent" | "mailto" | "error";

/**
 * What gets sent, always in English whatever language the page is in, so every response reads the same.
 * Built on the server from messages/en.json (see Contact.tsx).
 */
export type EnglishValues = {
  /** option id → English label, e.g. carrier → "Collaborative mobile robot" */
  interests: Record<string, string>;
  /** language the visitor was using, e.g. "Hindi (hi)" */
  language: string;
  mail: { subject: string; fallbackName: string; name: string; email: string; interest: string; language: string };
};

export default function ContactForm({ options, english }: { options: { id: string; label: string }[]; english: EnglishValues }) {
  const t = useTranslations("contact");
  const [status, setStatus] = useState<Status>("idle");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    if (data.get("company")) return; // honeypot: bots fill this, people never see it

    const interestId = String(data.get("interest") ?? "");
    const values = {
      name: String(data.get("name") ?? "").trim(),
      email: String(data.get("email") ?? "").trim(),
      interest: english.interests[interestId] ?? interestId,
      message: String(data.get("message") ?? "").trim(),
    };

    const { action, fields } = site.forms.contact;

    // Not connected to a Google Form yet → hand over to the visitor's email app.
    if (!action) {
      const m = english.mail;
      const subject = encodeURIComponent(m.subject.replace("{name}", values.name || m.fallbackName));
      const body = encodeURIComponent(
        `${values.message}\n\n${m.name}: ${values.name}\n${m.email}: ${values.email}\n${m.interest}: ${values.interest}\n${m.language}: ${english.language}`,
      );
      window.location.href = `${contact.email.href}?subject=${subject}&body=${body}`;
      setStatus("mailto");
      return;
    }

    setStatus("sending");
    try {
      const body = new URLSearchParams();
      body.append(fields.name, values.name);
      body.append(fields.email, values.email);
      body.append(fields.interest, values.interest);
      body.append(fields.message, values.message);
      // Google Forms does not send CORS headers, so the reply is opaque; a thrown error means the request never left.
      await fetch(action, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      });
      form.reset();
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  }

  return (
    <form className={styles.form} onSubmit={onSubmit}>
      <div className={styles.two}>
        <label>
          <span>{t("name")}</span>
          <input name="name" type="text" required autoComplete="name" placeholder={t("namePlaceholder")} />
        </label>
        <label>
          <span>{t("email")}</span>
          <input name="email" type="email" required autoComplete="email" placeholder={t("emailPlaceholder")} />
        </label>
      </div>

      <label>
        <span>{t("interest")}</span>
        <select name="interest" defaultValue="both">
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      </label>

      <label>
        <span>{t("message")}</span>
        <textarea name="message" required rows={5} placeholder={t("messagePlaceholder")} />
      </label>

      {/* honeypot */}
      <input name="company" type="text" tabIndex={-1} autoComplete="off" aria-hidden="true" className={styles.hp} />

      <div className={styles.actions}>
        <button type="submit" className="btn btn--tomato" disabled={status === "sending"}>
          {status === "sending" ? t("sending") : t("send")}
          <Send size={16} aria-hidden="true" />
        </button>
        <p className={styles.status} role="status" aria-live="polite">
          {status === "sent" && t("sent")}
          {status === "mailto" && t("mailto")}
          {status === "error" && t("error")}
        </p>
      </div>
    </form>
  );
}
