import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { BrandLockup } from "@/components/brand/BrandLockup";

export const dynamic = "force-dynamic";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="brand-refresh-scope brand-refresh-typography flex min-h-screen flex-col lg:flex-row">
      <header className="flex items-center justify-between gap-4 border-b bg-background px-4 py-4 lg:hidden">
        <Link
          href="/"
          aria-label="Go to Guestnix home"
          className="inline-flex min-w-0 items-center"
        >
          <BrandLockup
            size="sm"
            className="min-w-0"
            logoClassName="max-w-[132px]"
          />
        </Link>
        <Link
          href="/"
          className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to site</span>
        </Link>
      </header>

      {/* Left panel - branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary items-center justify-center p-12">
        <div className="max-w-md text-primary-foreground">
          <BrandLockup size="lg" tone="light" className="mb-5" />
          <p className="text-lg opacity-90">
            Create beautiful digital welcome guidebooks for your vacation rental
            guests. AI-powered, mobile-first, and easy to share.
          </p>
        </div>
      </div>

      {/* Right panel - auth form */}
      <div className="flex flex-1 items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}
