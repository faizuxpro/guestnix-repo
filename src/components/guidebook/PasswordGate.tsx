"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  slug: string;
  title: string;
  primaryColor?: string;
};

export function PasswordGate({ slug, title, primaryColor }: Props) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!password || loading) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/g/${slug}/unlock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const message =
          typeof data?.error === "string" ? data.error : "Incorrect password";
        setError(message);
        setLoading(false);
        return;
      }
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  const accent = primaryColor || "var(--primary)";

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background px-6">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center text-center space-y-3">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-full"
            style={{
              backgroundColor: `color-mix(in oklab, ${accent} 12%, transparent)`,
              color: accent,
            }}
          >
            <Lock className="h-5 w-5" />
          </div>
          <h1 className="text-lg font-semibold leading-tight">{title}</h1>
          <p className="text-sm text-muted-foreground">
            This guidebook is password protected. Enter the password to continue.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="gate-pw">Password</Label>
          <Input
            id="gate-pw"
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (error) setError(null);
            }}
            autoFocus
            autoComplete="current-password"
            aria-invalid={error ? true : undefined}
          />
          {error && (
            <p className="text-xs text-destructive" role="alert">
              {error}
            </p>
          )}
        </div>
        <Button
          type="submit"
          className="w-full"
          disabled={loading || !password}
          style={
            primaryColor
              ? { backgroundColor: primaryColor, color: "#fff" }
              : undefined
          }
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          Unlock
        </Button>
      </form>
    </div>
  );
}
