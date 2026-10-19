/**
 * ──────────────────────────────────────────────────────────────
 *  EDIT ME — contact details, video, forms, product names and codes.
 *  The words visitors read (in every language) are in messages/<locale>.json.
 *  Placeholder copy is marked (placeholder).
 * ──────────────────────────────────────────────────────────────
 */
interface SiteConfig {
  name: string;
  url: string;
  video: { src: string; poster: string; youtubeId: string };
  forms: {
    join: { url: string; embedUrl: string };
    contact: {
      action: string;
      fields: { name: string; email: string; interest: string; message: string };
    };
  };
}

export const site: SiteConfig = {
  name: "Versor Robotics",

  // Public address of the site, used for canonical + hreflang links. Set NEXT_PUBLIC_SITE_URL
  // (e.g. "https://versorrobotics.farm"); on Vercel the production domain is picked up automatically.
  url:
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000"),

  /* ── VIDEO ───────────────────────────────────────────────────
   * Option A (self-hosted): drop your file at  public/videos/versor-demo.mp4
   *   and (optionally) a poster image at       public/videos/poster.jpg, then set poster: "/videos/poster.jpg"
   * Option B (YouTube):     put the 11-character video id in `youtubeId`
   *   e.g. for https://youtu.be/dQw4w9WgXcQ  →  youtubeId: "dQw4w9WgXcQ"
   * If youtubeId is set it wins. If neither works, a "coming soon" TV shows.
   */
  video: {
    src: "/videos/versor-demo.mp4",
    poster: "", // no thumbnail yet: an empty string means the player asks for none
    youtubeId: "",
  },

  /* ── GOOGLE FORMS ────────────────────────────────────────────
   * join:    paste your form's share link. "Apply now" and every role open it.
   *          Optional `embedUrl` shows the form inline on the page
   *          (Google Forms → Send → </> Embed HTML → copy the iframe src).
   * contact: the styled contact form posts straight into a Google Form.
   *          See README.md → "Connect the contact form" for the 3 steps.
   *          While `action` is empty, the form falls back to opening the
   *          visitor's email app (mailto) so nothing is ever lost.
   */
  forms: {
    join: {
      url: "", // e.g. "https://forms.gle/xxxxxxxx"
      embedUrl: "", // e.g. "https://docs.google.com/forms/d/e/XXXX/viewform?embedded=true"
    },
    contact: {
      action: "", // e.g. "https://docs.google.com/forms/d/e/XXXX/formResponse"
      fields: {
        name: "", // e.g. "entry.1111111111"
        email: "", // e.g. "entry.2222222222"
        interest: "", // e.g. "entry.3333333333"
        message: "", // e.g. "entry.4444444444"
      },
    },
  },
};

/** Contact details: what is shown, and where each one links. */
export const contact = {
  phone: { label: "+91 73585 50729", href: "tel:+917358550729" },
  email: { label: "vidhyasagar@artpark.in", href: "mailto:vidhyasagar@artpark.in" },
  location: { label: "ARTGARAGE, Jalahalli", href: "https://maps.app.goo.gl/MeJVgti6JbmCGAaBA" },
} as const;

/**
 * Products. Names and codes stay in Latin script in every language, so they live here.
 * Everything a visitor reads about them (kind, tagline, bullet points) is in messages/<locale>.json under products.items.<id>.
 */
export const products = [
  {
    id: "carrier",
    index: "3.1",
    code: "VR-01",
    name: "Field-Mate", // working name: rename it here, nowhere else
  },
  {
    id: "spray",
    index: "3.2",
    code: "VR-02",
    name: "The pesticide printer",
  },
] as const;

/** Feature cards, in order. Copy: messages/<locale>.json → features.items.<id> */
export const features = ["follow", "spray", "asr", "waypoint"] as const;

/** (placeholder) open roles, in order. Copy: messages/<locale>.json → join.roles.<id> */
export const roles = ["manipulation", "perception", "fieldOps", "partnerships"] as const;

/** Nav + section order. Each id matches a chapter's anchor id; labels are in messages/<locale>.json → nav.<id> */
export const nav = ["vision", "video", "products", "features", "contact", "join", "play"] as const;
