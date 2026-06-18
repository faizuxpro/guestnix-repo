"use client";

import { useState } from "react";
import Link from "next/link";
import { createBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { APP_NAME } from "@/lib/constants";
import {
  authCallbackUrl,
  authStatusPath,
} from "@/lib/app-url";
import { productEvents } from "@/lib/analytics/product";
import {
  trackGaEvent,
  trackProductEvent,
} from "@/lib/analytics/product-client";
import { Loader2, Home, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type AccountType = "host" | "partner";

type SignupNotice =
  | { type: "confirmation_requested"; email: string }
  | { type: "account_status_hidden"; email: string };

type SignupAuthError = {
  code?: string;
  message: string;
  status?: number;
};

function getSignupErrorMessage(error: SignupAuthError) {
  const message = error.message.toLowerCase();

  if (
    error.status === 429 ||
    error.code === "over_email_send_rate_limit" ||
    error.code === "over_request_rate_limit" ||
    message.includes("rate limit") ||
    message.includes("too many requests")
  ) {
    return "We could not send a verification email right now because email delivery is temporarily limited. Please try again later or continue with Google.";
  }

  if (
    error.code === "email_address_not_authorized" ||
    message.includes("email address not authorized")
  ) {
    return "Verification emails are not configured for this address yet. Please continue with Google or contact support.";
  }

  if (
    error.code === "user_already_exists" ||
    error.code === "email_exists" ||
    message.includes("already registered")
  ) {
    return "An account may already exist for this email. Please sign in or reset your password instead.";
  }

  return error.message;
}

function isExistingUserHiddenBySupabase(
  user: { identities?: unknown[] } | null
) {
  return Array.isArray(user?.identities) && user.identities.length === 0;
}

export default function SignupPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accountType, setAccountType] = useState<AccountType>("host");
  const [loading, setLoading] = useState(false);
  const [signupNotice, setSignupNotice] = useState<SignupNotice | null>(null);

  const supabase = createBrowserClient();

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    trackProductEvent(productEvents.signupStarted, {
      method: "email",
      source: "signup_form",
    });
    trackGaEvent("signup_started", {
      method: "email",
      source: "signup_form",
    });

    setSignupNotice(null);
    const signupEmail = email.trim();

    const { data, error } = await supabase.auth.signUp({
      email: signupEmail,
      password,
      options: {
        data: { full_name: fullName, account_type: accountType },
        emailRedirectTo: authCallbackUrl(
          authStatusPath("signup", "/login?verified=email")
        ),
      },
    });

    if (error) {
      toast.error(getSignupErrorMessage(error));
      setLoading(false);
      return;
    }

    setSignupNotice({
      type: isExistingUserHiddenBySupabase(data.user)
        ? "account_status_hidden"
        : "confirmation_requested",
      email: signupEmail,
    });
    setLoading(false);
  }

  async function handleGoogleLogin() {
    trackProductEvent(productEvents.signupStarted, {
      method: "google_oauth",
      source: "signup_form",
    });
    trackGaEvent("signup_started", {
      method: "google_oauth",
      source: "signup_form",
    });

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: authCallbackUrl("/onboarding"),
      },
    });

    if (error) {
      toast.error(error.message);
    }
  }

  if (signupNotice) {
    return (
      <Card>
        <CardHeader className="text-center">
          {signupNotice.type === "confirmation_requested" ? (
            <>
              <CardTitle className="text-2xl">
                Verification requested
              </CardTitle>
              <CardDescription>
                We accepted your signup for{" "}
                <strong>{signupNotice.email}</strong>. A confirmation link
                should arrive shortly if email delivery is available.
              </CardDescription>
            </>
          ) : (
            <>
              <CardTitle className="text-2xl">Check your account</CardTitle>
              <CardDescription>
                If <strong>{signupNotice.email}</strong> is new, a confirmation
                link should arrive shortly. If you already have an account,
                sign in or reset your password.
              </CardDescription>
            </>
          )}
        </CardHeader>
        <CardFooter className="flex-col gap-2">
          {signupNotice.type === "account_status_hidden" && (
            <>
              <Button className="w-full" render={<Link href="/login" />}>
                Sign in
              </Button>
              <Button
                variant="outline"
                className="w-full"
                render={<Link href="/forgot-password" />}
              >
                Reset password
              </Button>
            </>
          )}
          <Button
            variant="ghost"
            className="w-full"
            onClick={() => setSignupNotice(null)}
          >
            Back to sign up
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Create your {APP_NAME} account</CardTitle>
        <CardDescription>
          Start building your digital guidebook in minutes
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setAccountType("host")}
            className={cn(
              "flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-colors",
              accountType === "host"
                ? "border-primary bg-primary/5 ring-1 ring-primary"
                : "border-border hover:bg-muted"
            )}
          >
            <Home className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">I&apos;m a Host</span>
            <span className="text-xs text-muted-foreground">
              Guidebooks for your own properties.
            </span>
          </button>

          <div
            aria-disabled
            className="relative flex cursor-not-allowed flex-col items-start gap-1 rounded-lg border border-dashed border-border p-3 text-left opacity-70"
          >
            <span className="absolute right-2 top-2 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Coming soon
            </span>
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">I&apos;m a Partner</span>
            <span className="text-xs text-muted-foreground">
              Manage clients as an agency.
            </span>
          </div>
        </div>

        <Button
          variant="outline"
          className="w-full"
          onClick={handleGoogleLogin}
          type="button"
        >
          <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          Continue with Google
        </Button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <Separator />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">or</span>
          </div>
        </div>

        <form onSubmit={handleSignup} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="name">Full name</Label>
            <Input
              id="name"
              type="text"
              placeholder="John Doe"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <PasswordInput
              id="password"
              placeholder="At least 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create account
          </Button>
        </form>
      </CardContent>
      <CardFooter className="justify-center">
        <p className="text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="text-primary font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
