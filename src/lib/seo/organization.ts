import { SITE } from "./site";

export function getOrganizationJsonLd() {
  return {
    "@type": "Organization" as const,
    "@id": `${SITE.url}#organization`,
    name: SITE.name,
    url: SITE.url,
    logo: {
      "@type": "ImageObject" as const,
      url: `${SITE.url}${SITE.logoPath}`,
    },
    sameAs: [`https://twitter.com/${SITE.twitter.replace("@", "")}`],
  };
}
