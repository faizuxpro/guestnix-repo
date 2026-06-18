"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, KeyRound, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = useMemo(() => createBrowserClient(), []);
  const [checkingSession, setCheckingSession] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function checkSession() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!isMounted) return;
      setHasSession(Boolean(user));
      setCheckingSession(false);
    }

    checkSession();

    return () => {
      isMounted = false;
    };
  }, [supabase]);

  useEffect(() => {
    if (!completed) return;

    const timeout = window.setTimeout(() => {
      router.push("/dashboard");
      router.refresh();
    }, 1800);

    return () => window.clearTimeout(timeout);
  }, [completed, router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    setCompleted(true);
    setLoading(false);
    toast.success("Password updated");
  }

  if (checkingSession) {
    return (
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
          <CardTitle className="text-2xl">Opening reset link</CardTitle>
          <CardDescription>
            We&apos;re checking the recovery session from your email.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!hasSession) {
    return (
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <KeyRound className="h-5 w-5" />
          </div>
          <CardTitle className="text-2xl">Reset link expired</CardTitle>
          <CardDescription>
            This password reset link is invalid or has already been used.
          </CardDescription>
        </CardHeader>
        <CardFooter className="flex-col gap-2">
          <Button
            className="w-full"
            type="button"
            onClick={() => router.push("/forgot-password")}
          >
            Request a new link
          </Button>
          <Link
            href="/login"
            className="text-sm font-medium text-primary hover:underline"
          >
            Back to sign in
          </Link>
        </CardFooter>
      </Card>
    );
  }

  if (completed) {
    return (
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <CardTitle className="text-2xl">Password updated</CardTitle>
          <CardDescription>
            Your new password is saved. Taking you to your dashboard.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Button
            className="w-full"
            type="button"
            onClick={() => {
              router.push("/dashboard");
              router.refresh();
            }}
          >
            Continue to dashboard
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Choose a new password</CardTitle>
        <CardDescription>
          Set a new password for your Guestnix account.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="password">New password</Label>
            <PasswordInput
              id="password"
              placeholder="At least 6 characters"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={6}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm-password">Confirm password</Label>
            <PasswordInput
              id="confirm-password"
              placeholder="Repeat your new password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              minLength={6}
              required
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <KeyRound className="mr-2 h-4 w-4" />
            )}
            Save new password
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
