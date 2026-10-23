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

/**
 * The one public address of the site: metadataBase, canonical, hreflang, og:url, og:image, sitemap, robots and
 * JSON-LD all use it. NEXT_PUBLIC_SITE_URL can override it; it is never built from VERCEL_URL, so every
 * deployment points search engines at the real address. No trailing slash.
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.versorbots.com").replace(/\/+$/, "");

export const site: SiteConfig = {
  name: "Versor Robotics",

  url: SITE_URL,

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
      action: "https://docs.google.com/forms/d/e/1FAIpQLSf4PRk88ng_O9EXkML1_RW2-Xx28T_REU2P9DJ-fV4rqG-Riw/formResponse",
      fields: {
        name: "entry.356682",
        email: "entry.1470962296",
        interest: "entry.2015715880",
        message: "entry.8242097",
      },
    },
  },
};

/** Contact details: what is shown, and where each one links. */
export const contact = {
  phone: { label: "+91 73585 50729", href: "tel:+917358550729" },
  email: { label: "vidhyasagar@artpark.in", href: "mailto:vidhyasagar@artpark.in" },
  location: { label: "ARTGARAGE, Jalahalli", href: "https://maps.app.goo.gl/MeJVgti6JbmCGAaBA" },
  instagram: { label: "@versorrobotics", href: "https://www.instagram.com/versorrobotics/" },
} as const;

/**
 * For search engines (the home page's Organization structured data).
 * profiles: our own pages on other sites (sameAs), e.g. the company's Instagram, LinkedIn or YouTube page.
 *           Only pages that are about the company itself, never single posts or videos.
 * coverage: posts and videos by others that are about us (subjectOf).
 */
export const presence = {
  logo: "/logo.png",
  address: { street: "ARTGARAGE, Jalahalli", locality: "Bengaluru", region: "Karnataka", country: "IN" },
  profiles: [contact.instagram.href, "https://pitchbook.com/profiles/company/962066-26"],
  coverage: [
    { name: "Versor Robotics Pitch (Campus Fund)", url: "https://www.youtube.com/shorts/ZptsHeMqcws" },
    {
      name: "Building Robots for Indian Farms | Viboosithasri NS | Versor Robotics | ARTPARK | INWED 2026",
      url: "https://www.youtube.com/shorts/JLGS2Sg34Bk",
    },
    {
      name: "Viboosithasri's Journey from Corporate to Farm Automation Pioneer (ARTPARK on LinkedIn)",
      url: "https://www.linkedin.com/posts/artpark-in_inwed2026-womeninengineering-artpark-activity-7475140340933525505-hyNR",
    },
    { name: "Instagram reel about Versor Robotics", url: "https://www.instagram.com/reel/DbkvOB5hu7H/" },
  ],
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
