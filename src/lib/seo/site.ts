import { getPublicAppOrigin } from "@/lib/app-url";

export const SITE = {
  name: "Guestnix",
  tagline: "Digital Welcome Guidebooks for Vacation Rental Hosts",
  description:
    "Build a beautiful digital welcome guide with an AI concierge that answers guest questions for you.",
  url: getPublicAppOrigin(),
  twitter: "@guestnix",
  logoPath: "/logo.png",
} as const;
