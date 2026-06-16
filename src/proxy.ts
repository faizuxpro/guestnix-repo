import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { resolveCustomDomainToSlug } from "@/lib/custom-domain-resolver";

/**
 * Proxy runs in the Node.js runtime, so we can use the Drizzle DB client for
 * the custom-domain lookup.
 */
// Hosts that should NOT be treated as custom domains — they're our own
// canonical app traffic. Localhost gets included so dev works.
function isCanonicalHost(host: string): boolean {
  const canonical = (
    process.env.NEXT_PUBLIC_CANONICAL_HOST ?? ""
  )
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "");

  if (!host) return true;
  if (host === "localhost" || host.endsWith(".localhost")) return true;
  if (host.startsWith("127.0.0.1") || host.startsWith("192.168.")) return true;
  if (host.endsWith(".herokuapp.com")) return true;
  if (host.endsWith(".vercel.app")) return true; // legacy preview hosts
  if (!canonical) {
    // If the operator hasn't set NEXT_PUBLIC_CANONICAL_HOST yet, fall back
    // to "any host is canonical" so we never accidentally treat real
    // traffic as a custom domain.
    return true;
  }
  return host === canonical || host === `www.${canonical}`;
}

export async function proxy(request: NextRequest) {
  const rawHost = request.headers.get("host") ?? "";
  const host = rawHost.toLowerCase().replace(/:\d+$/, "");

  // Custom-domain routing: if the request came in on a host we don't own,
  // try to map it to a published guidebook slug and rewrite the URL.
  // Only does the DB lookup for non-canonical hosts.
  if (!isCanonicalHost(host)) {
    try {
      const slug = await resolveCustomDomainToSlug(host);
      if (slug) {
        const url = request.nextUrl.clone();
        // Custom-domain visitors always land on the root of the guidebook.
        // Sub-paths under the host (e.g. /manifest.webmanifest) get prefixed
        // with the slug so existing /g/[slug]/* routes pick them up.
        const incoming = url.pathname === "/" ? "" : url.pathname;
        url.pathname = `/g/${slug}${incoming}`;
        return NextResponse.rewrite(url);
      }
      // Unknown host that doesn't match any custom domain — let Next
      // handle it as a normal request (it will probably 404).
    } catch (err) {
      // Custom-domain lookup failed — don't let it block canonical
      // traffic. Log and fall through to normal session handling.
      console.error("Custom-domain resolver failed:", err);
    }
  }

  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
