import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { resolveCustomDomainToSlug } from "@/lib/custom-domain-resolver";

/**
 * Proxy runs in the Node.js runtime, so we can use the Drizzle DB client for
 * the custom-domain lookup.
 */
function isCanonicalHost(host: string): boolean {
  const canonical = (process.env.NEXT_PUBLIC_CANONICAL_HOST ?? "")
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "");

  if (!host) return true;
  if (host === "localhost" || host.endsWith(".localhost")) return true;
  if (host.startsWith("127.0.0.1") || host.startsWith("192.168.")) return true;
  if (host.endsWith(".herokuapp.com")) return true;
  if (host.endsWith(".vercel.app")) return true;
  if (!canonical) return true;
  return host === canonical || host === `www.${canonical}`;
}

export async function proxy(request: NextRequest) {
  const rawHost = request.headers.get("host") ?? "";
  const host = rawHost.toLowerCase().replace(/:\d+$/, "");
  const pathname = request.nextUrl.pathname;

  if (!isCanonicalHost(host)) {
    if (
      pathname.startsWith("/api/") ||
      pathname === "/sw.js" ||
      pathname === "/robots.txt" ||
      pathname === "/sitemap.xml"
    ) {
      return await updateSession(request);
    }

    try {
      const slug = await resolveCustomDomainToSlug(host);
      if (slug) {
        const url = request.nextUrl.clone();
        const incoming = pathname === "/" ? "" : pathname;
        url.pathname = `/g/${slug}${incoming}`;
        return NextResponse.rewrite(url);
      }

      return new NextResponse("Custom domain is not configured.", {
        status: 404,
      });
    } catch (err) {
      console.error("Custom-domain resolver failed:", err);
      return new NextResponse("Custom domain is temporarily unavailable.", {
        status: 503,
      });
    }
  }

  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
