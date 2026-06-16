"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api-fetch";

export function NewsletterSignup({
  heading = "Get host tips in your inbox",
  body = "Monthly articles on building better guest experiences. No spam.",
}: {
  heading?: string;
  body?: string;
}) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setStatus("loading");
    setErrorMessage(null);
    const result = await apiFetch("/api/newsletter/subscribe", {
      method: "POST",
      body: { email, source: "blog" },
    });
    if (result.ok) {
      setStatus("ok");
      setEmail("");
    } else {
      setStatus("error");
      setErrorMessage(result.error.message);
    }
  }

  return (
    <aside className="not-prose my-10 rounded-2xl border border-neutral-200 bg-neutral-50 p-6 sm:p-8">
      <h3 className="text-xl font-bold tracking-tight text-neutral-900">{heading}</h3>
      <p className="mt-2 text-sm text-neutral-600">{body}</p>
      <form onSubmit={onSubmit} className="mt-4 flex flex-col gap-2 sm:flex-row">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
          aria-label="Email address"
          className="flex-1 rounded-full border border-neutral-300 bg-white px-4 py-2.5 text-sm focus:border-[var(--marketing-primary)] focus:outline-none"
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className={cn(
            "rounded-full bg-neutral-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-neutral-800 transition",
            status === "loading" && "opacity-70",
          )}
        >
          {status === "loading" ? "Subscribing…" : "Subscribe"}
        </button>
      </form>
      {status === "ok" && (
        <p className="mt-3 text-sm text-emerald-700">Thanks! Check your inbox to confirm.</p>
      )}
      {status === "error" && (
        <p className="mt-3 text-sm text-red-700">
          {errorMessage ?? "Something went wrong. Please try again."}
        </p>
      )}
    </aside>
  );
}

