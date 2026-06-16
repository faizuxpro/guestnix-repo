import { NextResponse } from "next/server";
import { getProvider } from "@/lib/billing/provider";
import { activateFromEvent } from "@/lib/billing/subscription";
import { productEvents } from "@/lib/analytics/product";
import { trackServerProductEvent } from "@/lib/analytics/posthog-server";
import { syncProductUserProfile } from "@/lib/analytics/product-user";

// Needs the Drizzle (postgres) client, which can't run on the edge runtime.
export const runtime = "nodejs";

/**
 * Gumroad Ping endpoint. Parses + normalizes the form-encoded payload, then
 * flips internal subscription state. Activation is idempotent (unique
 * provider+sale_id on `payments`). We always return 200 on processing errors
 * so Gumroad doesn't retry-storm — unmatched sales are logged.
 *
 * Optional auth: if GUMROAD_WEBHOOK_SECRET is set, configure the Gumroad Ping
 * URL as `.../api/billing/gumroad/webhook?key=<secret>`. The key never appears
 * in the user-facing checkout URL.
 */
export async function POST(request: Request) {
  const secret = process.env.GUMROAD_WEBHOOK_SECRET;
  if (secret) {
    const key = new URL(request.url).searchParams.get("key");
    if (key !== secret) {
      return new NextResponse("forbidden", { status: 403 });
    }
  }

  try {
    const provider = getProvider();
    const event = await provider.parseWebhook(request);
    if (event) {
      await activateFromEvent(event, provider.name);
      if (event.userId && event.type !== "unknown") {
        await Promise.all([
          trackServerProductEvent({
            distinctId: event.userId,
            event: productEvents.subscriptionUpdated,
            properties: {
              plan_name: event.plan ?? undefined,
              billing_interval: event.interval ?? undefined,
              status: event.type,
              source: provider.name,
            },
          }),
          syncProductUserProfile(event.userId),
        ]);
      }
    }
  } catch (err) {
    console.error("POST /api/billing/gumroad/webhook failed", err);
  }

  return new NextResponse("ok", { status: 200 });
}
