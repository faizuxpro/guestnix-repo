"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import { usePathname } from "next/navigation";
import { createBrowserClient } from "@/lib/supabase/client";
import {
  canLoadClientAnalytics,
  isMarketingAnalyticsPath,
} from "@/lib/analytics/privacy";
import {
  identifyProductUser,
  initPostHog,
  trackGaEvent,
  trackGaPageView,
  trackProductEvent,
} from "@/lib/analytics/product-client";
import { productEvents } from "@/lib/analytics/product";

export function AnalyticsProvider() {
  const pathname = usePathname();
  const [gaReady, setGaReady] = useState(false);

  const canLoad = canLoadClientAnalytics(pathname);
  const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  const shouldLoadGa = Boolean(
    canLoad && measurementId && isMarketingAnalyticsPath(pathname)
  );

  useEffect(() => {
    if (!canLoad) return;

    initPostHog(pathname);

    const supabase = createBrowserClient();
    void supabase.auth.getUser().then(({ data }) => {
      identifyProductUser(data.user?.id);
    });
  }, [canLoad, pathname]);

  useEffect(() => {
    if (!canLoad) return;

    if (pathname === "/onboarding") {
      trackProductEvent(productEvents.onboardingStarted, {
        source: "page_view",
      });
    }

    if (pathname === "/pricing") {
      trackProductEvent(productEvents.pricingViewed, {
        source: "page_view",
      });
    }
  }, [canLoad, pathname]);

  useEffect(() => {
    if (!gaReady || !shouldLoadGa) return;
    trackGaPageView(pathname);
  }, [gaReady, pathname, shouldLoadGa]);

  useEffect(() => {
    if (!gaReady || !shouldLoadGa || pathname !== "/pricing") return;
    trackGaEvent("pricing_viewed", {
      source: "page_view",
    });
  }, [gaReady, pathname, shouldLoadGa]);

  return (
    <>
      {shouldLoadGa ? (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
            strategy="afterInteractive"
          />
          <Script
            id="guestnix-ga4"
            strategy="afterInteractive"
            onReady={() => setGaReady(true)}
            dangerouslySetInnerHTML={{
              __html: `
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                window.gtag = gtag;
                gtag('js', new Date());
                gtag('config', '${measurementId}', { send_page_view: false });
              `,
            }}
          />
        </>
      ) : null}
    </>
  );
}
