import { setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Mascot from "@/components/Mascot";
import SmoothAnchors from "@/components/SmoothAnchors";

/** Chrome shared by the public marketing pages. Other route groups (login, dashboard…) can have their own layout. */
export default async function MarketingLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale as Locale); // the root layout has already 404ed anything else
  return (
    <>
      <Header />
      <main>{children}</main>
      <Footer />
      <Mascot />
      <SmoothAnchors />
    </>
  );
}
