"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, KeyRound, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { authCallbackUrl } from "@/lib/app-url";
import { createBrowserClient } from "@/lib/supabase/client";

export function SecuritySettingsTab({ email }: { email: string }) {
  const supabase = useMemo(() => createBrowserClient(), []);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function sendResetLink() {
    setSending(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: authCallbackUrl("/reset-password"),
    });
    setSending(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    setSent(true);
    toast.success("Password reset email sent");
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <KeyRound className="h-4 w-4 text-primary" />
            Password
          </CardTitle>
          <CardDescription>
            Send a secure password reset link to your account email.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border bg-muted/30 p-4">
            <p className="text-sm font-medium">Reset link destination</p>
            <p className="mt-1 break-all text-sm text-muted-foreground">
              {email}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={sendResetLink} disabled={sending || !email}>
              {sending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <KeyRound className="mr-2 h-4 w-4" />
              )}
              Send reset link
            </Button>
            {sent && (
              <span className="inline-flex items-center gap-1.5 text-sm text-emerald-600">
                <CheckCircle2 className="h-4 w-4" />
                Email sent
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Account access
          </CardTitle>
          <CardDescription>
            Guestnix uses Supabase auth sessions for dashboard access.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Keep your email current and use the reset link flow when you need a
            new password.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
