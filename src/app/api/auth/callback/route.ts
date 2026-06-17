import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { safeRelativePath } from "@/lib/app-url";
import { productEvents } from "@/lib/analytics/product";
import { trackServerProductEvent } from "@/lib/analytics/posthog-server";
import { syncProductUserProfile } from "@/lib/analytics/product-user";

type EmailOtpType =
  | "signup"
  | "invite"
  | "magiclink"
  | "recovery"
  | "email_change"
  | "email";

const EMAIL_OTP_TYPES = new Set<EmailOtpType>([
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
]);

function getEmailOtpType(value: string | null): EmailOtpType | null {
  if (!value) return null;

  return EMAIL_OTP_TYPES.has(value as EmailOtpType)
    ? (value as EmailOtpType)
    : null;
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = getEmailOtpType(searchParams.get("type"));
  const redirect = safeRelativePath(searchParams.get("redirect"));

  if (code || (tokenHash && type)) {
    const redirectUrl = new URL(redirect, origin);
    const supabaseResponse = NextResponse.redirect(redirectUrl);

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

    const { data, error } = code
      ? await supabase.auth.exchangeCodeForSession(code)
      : await supabase.auth.verifyOtp({
          token_hash: tokenHash!,
          type: type!,
        });

    if (error) {
      return NextResponse.redirect(
        new URL("/auth/verified?flow=error", origin)
      );
    }

    const flow = redirectUrl.searchParams.get("flow");
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
