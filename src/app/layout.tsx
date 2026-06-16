import type { Metadata } from "next";
import {
  Bricolage_Grotesque,
  Geist_Mono,
  Fraunces,
  Playfair_Display,
} from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { FeedbackDialogProvider } from "@/components/ui/feedback-dialog";
import { OfflineIndicator } from "@/components/online-status";
import { AnalyticsProvider } from "@/components/analytics/AnalyticsProvider";
import { SentryFeedbackWidget } from "@/components/analytics/SentryFeedbackWidget";
import { SITE } from "@/lib/seo/site";
import "./globals.css";

const bricolageGrotesque = Bricolage_Grotesque({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-serif",
  subsets: ["latin"],
  axes: ["SOFT", "opsz"],
});

const playfairDisplay = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  style: ["italic"],
  weight: ["700"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: "Guestnix - Digital Welcome Guidebooks for Vacation Rentals",
    template: "%s | Guestnix",
  },
  description:
    "Create beautiful, interactive digital welcome guidebooks for your Airbnb and vacation rental guests. AI-powered concierge, maps, and more.",
  keywords: [
    "airbnb welcome guide",
    "vacation rental guidebook",
    "digital welcome book",
    "guest guidebook",
    "rental host tools",
  ],
  icons: {
    icon: [
      {
        url: "/brand/Guestnix icon (for light bg).svg",
        type: "image/svg+xml",
      },
    ],
    shortcut: "/brand/Guestnix icon (for light bg).svg",
    apple: [
      {
        url: "/brand/Guestnix icon (for light bg).svg",
      },
    ],
  },
  verification: process.env.GOOGLE_SITE_VERIFICATION
    ? { google: process.env.GOOGLE_SITE_VERIFICATION }
    : undefined,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${bricolageGrotesque.variable} ${geistMono.variable} ${fraunces.variable} ${playfairDisplay.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <TooltipProvider>
          <FeedbackDialogProvider>
            {children}
          </FeedbackDialogProvider>
        </TooltipProvider>
        <AnalyticsProvider />
        <SentryFeedbackWidget />
        <OfflineIndicator />
        <Toaster position="top-center" offset={{ top: 16 }} />
      </body>
    </html>
  );
}
