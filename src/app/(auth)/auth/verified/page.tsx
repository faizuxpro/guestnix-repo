"use client";

import { Suspense, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, CheckCircle2, Loader2, XCircle } from "lucide-react";
import { safeRelativePath } from "@/lib/app-url";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type Flow = "signup" | "magic" | "signin" | "error";

const FLOW_COPY: Record<
  Exclude<Flow, "error">,
  { title: string; description: string; defaultNext: string; action: string }
> = {
  signup: {
    title: "Email verified",
    description:
      "Your account is active. We'll take you to sign in so you can continue.",
    defaultNext: "/login?verified=email",
    action: "Go to sign in",
  },
  magic: {
    title: "You're signed in",
    description: "Your magic link worked. We'll take you back into Guestnix.",
    defaultNext: "/dashboard",
    action: "Continue",
  },
  signin: {
    title: "You're signed in",
    description: "Your session is ready. We'll take you back into Guestnix.",
    defaultNext: "/dashboard",
    action: "Continue",
  },
};

export default function VerifiedPage() {
  return (
    <Suspense fallback={<VerifiedFallback />}>
      <VerifiedContent />
    </Suspense>
  );
}

function VerifiedContent() {
  const searchParams = useSearchParams();
  const flow = getFlow(searchParams.get("flow"));

  if (flow === "error") {
    return <VerificationError />;
  }

  const copy = FLOW_COPY[flow];
  const next = safeRelativePath(searchParams.get("next"), copy.defaultNext);

  return (
    <VerificationSuccess
      action={copy.action}
      description={copy.description}
      next={next}
      title={copy.title}
    />
  );
}

function VerificationSuccess({
  action,
  description,
  next,
  title,
}: {
  action: string;
  description: string;
  next: string;
  title: string;
}) {
  const router = useRouter();

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      router.push(next);
      router.refresh();
    }, 1800);

    return () => window.clearTimeout(timeout);
  }, [next, router]);

  return (
    <Card>
      <CardHeader className="text-center">
        <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
          <CheckCircle2 className="h-5 w-5" />
        </div>
        <CardTitle className="text-2xl">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-center gap-2 rounded-md border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Continuing automatically
        </div>
      </CardContent>
      <CardFooter>
        <Button
          className="w-full"
          type="button"
          onClick={() => {
            router.push(next);
            router.refresh();
          }}
        >
          {action}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}

function VerificationError() {
  const router = useRouter();

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      router.push("/login?verified=failed");
      router.refresh();
    }, 3500);

    return () => window.clearTimeout(timeout);
  }, [router]);

  return (
    <Card>
      <CardHeader className="text-center">
        <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <XCircle className="h-5 w-5" />
        </div>
        <CardTitle className="text-2xl">Link could not be verified</CardTitle>
        <CardDescription>
          The email link may have expired or already been used.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-center gap-2 rounded-md border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Returning to sign in
        </div>
      </CardContent>
      <CardFooter className="flex-col gap-2">
        <Button
          className="w-full"
          type="button"
          onClick={() => {
            router.push("/login?verified=failed");
            router.refresh();
          }}
        >
          Back to sign in
        </Button>
        <Link
          href="/forgot-password"
          className="text-sm font-medium text-primary hover:underline"
        >
          Request a password reset
        </Link>
      </CardFooter>
    </Card>
  );
}

function VerifiedFallback() {
  return (
    <Card>
      <CardHeader className="text-center">
        <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
        <CardTitle className="text-2xl">Finalizing sign in</CardTitle>
        <CardDescription>Preparing your Guestnix session.</CardDescription>
      </CardHeader>
    </Card>
  );
}

function getFlow(value: string | null): Flow {
  if (value === "signup" || value === "magic" || value === "error") {
    return value;
  }

  return "signin";
}
