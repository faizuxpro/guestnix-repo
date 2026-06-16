"use client";

import { useEffect, useMemo, useState } from "react";
import { Banknote } from "lucide-react";
import type { CurrencyContent } from "../types";

type Rates = Record<string, number>;
type RatesState = {
  key: string;
  rates: Rates | null;
  error: string | null;
};

function formatAmount(value: number, code: string): string {
  if (!Number.isFinite(value)) return "—";
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: code,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${value.toFixed(2)} ${code}`;
  }
}

export function CurrencyBlock({
  content,
}: {
  content: Partial<CurrencyContent>;
}) {
  const base = (content.base ?? "USD").toUpperCase();
  const targets = (content.targets ?? [])
    .filter((c) => typeof c === "string" && c !== base)
    .map((c) => c.toUpperCase());
  const targetsKey = targets.join(",");
  const requestKey = `${base}:${targetsKey}`;
  const defaultAmount = Number.isFinite(content.default_amount)
    ? Number(content.default_amount)
    : 1;

  const [amount, setAmount] = useState<string>(String(defaultAmount));
  const [ratesState, setRatesState] = useState<RatesState>({
    key: "",
    rates: null,
    error: null,
  });

  useEffect(() => {
    if (!targetsKey) return;

    let cancelled = false;
    const url = `https://api.frankfurter.dev/v1/latest?base=${encodeURIComponent(
      base
    )}&symbols=${encodeURIComponent(targetsKey)}`;
    fetch(url)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("failed"))))
      .then((data: { rates?: Rates }) => {
        if (cancelled) return;
        setRatesState({
          key: requestKey,
          rates: data.rates ?? {},
          error: null,
        });
      })
      .catch(() => {
        if (cancelled) return;
        setRatesState({
          key: requestKey,
          rates: null,
          error: "Live rates unavailable",
        });
      });
    return () => {
      cancelled = true;
    };
  }, [base, requestKey, targetsKey]);

  const amt = useMemo(() => {
    const n = Number(amount);
    return Number.isFinite(n) ? n : 0;
  }, [amount]);

  if (targets.length === 0) return null;

  const isCurrentResult = ratesState.key === requestKey;
  const rates = isCurrentResult ? ratesState.rates : null;
  const error = isCurrentResult ? ratesState.error : null;
  const loading = !isCurrentResult;

  return (
    <div className="my-3 overflow-hidden rounded-2xl border bg-white">
      <header
        className="flex items-center gap-2 px-4 py-3 text-white"
        style={{ background: "var(--primary,#0a2321)" }}
      >
        <Banknote className="h-4 w-4" />
        <p className="text-[13px] font-semibold">Currency converter</p>
      </header>

      <div className="space-y-3 p-4">
        <label className="block">
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-neutral-500">
            Amount in {base}
          </span>
          <input
            type="number"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="mt-1 w-full rounded-md border border-neutral-200 px-3 py-2 text-[18px] font-semibold tabular-nums focus:border-neutral-900 focus:outline-none"
          />
        </label>

        {error ? (
          <p className="text-[12px] text-amber-700">{error}</p>
        ) : null}

        <div className="grid grid-cols-2 gap-2">
          {targets.map((code) => {
            const rate = rates?.[code];
            const converted = typeof rate === "number" ? amt * rate : null;
            return (
              <div
                key={code}
                className="rounded-lg border bg-neutral-50 px-3 py-2"
              >
                <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                  {code}
                </p>
                <p className="text-[16px] font-semibold tabular-nums text-neutral-900">
                  {loading
                    ? "…"
                    : converted !== null
                      ? formatAmount(converted, code)
                      : "—"}
                </p>
              </div>
            );
          })}
        </div>
        <p className="text-right text-[10px] text-neutral-400">
          Rates via frankfurter.dev
        </p>
      </div>
    </div>
  );
}
