import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { safeRelativePath } from "@/lib/app-url";
import { productEvents } from "@/lib/analytics/product";
import { trackServerProductEvent } from "@/lib/analytics/posthog-server";
import { syncProductUserProfile } from "@/lib/analytics/product-user";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const redirect = safeRelativePath(searchParams.get("redirect"));

  if (code) {
    const supabaseResponse = NextResponse.redirect(new URL(redirect, origin));
    const redirectUrl = new URL(redirect, origin);
    const flow = redirectUrl.searchParams.get("flow");

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      return NextResponse.redirect(
        new URL("/auth/verified?flow=error", origin)
      );
    }

    const userId = data.session?.user.id;
    try {
      if (userId && flow === "signup") {
        await Promise.all([
          trackServerProductEvent({
            distinctId: userId,
            event: productEvents.signupCompleted,
            properties: {
              method: "email",
              flow: "signup",
            },
          }),
          syncProductUserProfile(userId),
        ]);
      } else if (userId && redirect === "/onboarding") {
        await Promise.all([
          trackServerProductEvent({
            distinctId: userId,
            event: productEvents.signupCompleted,
            properties: {
              method: "google_oauth",
              flow: "signup",
            },
          }),
          syncProductUserProfile(userId),
        ]);
      }
    } catch (analyticsError) {
      console.warn("[auth] Failed to record auth callback analytics", {
        flow,
        redirect,
        error: analyticsError,
      });
    }

    if (flow === "signup") {
      const { error: signOutError } = await supabase.auth.signOut({
        scope: "local",
      });
      if (signOutError) {
        console.warn("[auth] Failed to clear signup confirmation session", {
          code: signOutError.code,
          status: signOutError.status,
          message: signOutError.message,
        });
      }
    }

    return supabaseResponse;
  }

  return NextResponse.redirect(new URL("/auth/verified?flow=error", origin));
}
