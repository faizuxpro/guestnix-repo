"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { getFeedback } from "@sentry/browser";
import {
  isProductionTelemetryEnabled,
  isPublicGuidebookPath,
} from "@/lib/analytics/privacy";

export function SentryFeedbackWidget() {
  const pathname = usePathname();

  useEffect(() => {
    if (
      !process.env.NEXT_PUBLIC_SENTRY_DSN ||
      !isProductionTelemetryEnabled() ||
      isPublicGuidebookPath(pathname)
    ) {
      return;
    }

    const feedback = getFeedback();
    const widget = feedback?.createWidget({
      triggerLabel: "Feedback",
      triggerAriaLabel: "Send feedback",
      formTitle: "Send feedback",
      messageLabel: "What happened?",
      messagePlaceholder: "Tell us what went wrong or what would help.",
      submitButtonLabel: "Send",
      cancelButtonLabel: "Cancel",
      successMessageText: "Thanks, we received your feedback.",
      showName: false,
      showEmail: false,
      isNameRequired: false,
      isEmailRequired: false,
      enableScreenshot: true,
      showBranding: false,
      colorScheme: "system",
      tags: {
        surface: "owned_app",
      },
    });

    widget?.appendToDom();
    return () => widget?.removeFromDom();
  }, [pathname]);

  return null;
}
