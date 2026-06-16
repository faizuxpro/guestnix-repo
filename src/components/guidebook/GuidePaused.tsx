import { Lock } from "lucide-react";

/**
 * Shown to guests when a published guide's owner is no longer entitled (trial
 * ended without payment, or subscription canceled). Rendered in place of the
 * viewer by src/app/g/[slug]/page.tsx. Server component — no interactivity.
 */
export function GuidePaused({
  title,
  primaryColor = "#002927",
}: {
  title?: string;
  primaryColor?: string;
}) {
  return (
    <div
      className="flex min-h-screen items-center justify-center p-6 text-white"
      style={{ backgroundColor: primaryColor }}
    >
      <div className="max-w-md space-y-5 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/10">
          <Lock className="h-7 w-7" />
        </div>
        <h1 className="text-2xl font-semibold">
          {title ? `${title} is currently unavailable` : "This guide is currently unavailable"}
        </h1>
        <p className="text-base leading-relaxed text-white/80">
          The host needs to renew their subscription to make this guide
          available again. Please check back soon. Visit Guestnix.com for more information.
        </p>
      </div>
    </div>
  );
}
