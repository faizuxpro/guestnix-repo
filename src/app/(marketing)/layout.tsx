import type { Metadata } from "next";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import "./marketing.css";

export const metadata: Metadata = {
  title: {
    default: "Guestnix — Digital Welcome Guidebooks for Vacation Rental Hosts",
    template: "%s | Guestnix",
  },
  description:
    "Stop answering the same Wi-Fi question at 11 pm. Build a beautiful digital welcome guide with an AI concierge that answers guest questions for you. Free forever.",
  openGraph: {
    type: "website",
    siteName: "Guestnix",
  },
};

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="marketing-scope brand-refresh-scope brand-refresh-typography" data-marketing>
      <MarketingNav />
      <main className="pt-24 md:pt-28 lg:pt-32">{children}</main>
      <MarketingFooter />
    </div>
  );
}
