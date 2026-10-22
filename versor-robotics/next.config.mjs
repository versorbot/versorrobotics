import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

// Vercel sets VERCEL_ENV to "production" only for production deployments.
const isProduction = process.env.VERCEL_ENV === "production";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // this folder is the project root, whatever lockfiles sit in folders above it
  turbopack: { root: import.meta.dirname },

  // the old Vercel address sends visitors and search engines to the real one; previews and local dev are untouched
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "versorrobotics.vercel.app" }],
        destination: "https://www.versorbots.com/:path*",
        permanent: true,
      },
    ];
  },

  // keep preview and other non-production deployments out of search results
  async headers() {
    if (isProduction) return [];
    return [{ source: "/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] }];
  },
};

export default withNextIntl(nextConfig);
