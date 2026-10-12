import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // this folder is the project root, whatever lockfiles sit in folders above it
  turbopack: { root: import.meta.dirname },
};

export default withNextIntl(nextConfig);
