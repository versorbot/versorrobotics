import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

/** Picks the language: the URL prefix wins, then the visitor's saved choice (cookie), then their browser language. */
export default createMiddleware(routing);

export const config = {
  // everything except API routes, Next internals and files with an extension (favicon.ico, videos …)
  matcher: "/((?!api|_next|_vercel|.*\\..*).*)",
};
