"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  Globe,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api-fetch";
import { withHostPreviewParam } from "@/lib/analytics/host-preview";
import { toastApiError } from "@/lib/toast-error";
import { useFeedbackDialog } from "@/components/ui/feedback-dialog";

type DnsInstruction = {
  recordType: "CNAME" | "A" | "ALIAS" | "TXT";
  name: string;
  value: string;
  description?: string;
};

type CustomDomain = {
  id: string;
  domain: string;
  status: "pending" | "verified" | "active" | "error";
  domainKind: "apex" | "subdomain";
  verificationToken: string | null;
  verifiedAt: string | null;
  providerDomainId: string | null;
  sslStatus: "pending" | "active" | "error";
  sslError: string | null;
  lastCheckedAt: string | null;
  createdAt: string;
  updatedAt: string;
  dnsInstructions: DnsInstruction[];
  verificationTxt: DnsInstruction | null;
};

type Props = {
  guidebookId: string;
  guidebookSlug: string;
};

const STATUS_COPY: Record<
  CustomDomain["status"],
  { label: string; tone: "default" | "secondary" | "destructive"; icon: React.ElementType }
> = {
  pending: { label: "Pending DNS", tone: "secondary", icon: Clock },
  verified: { label: "Issuing TLS", tone: "secondary", icon: Loader2 },
  active: { label: "Live", tone: "default", icon: CheckCircle2 },
  error: { label: "Error", tone: "destructive", icon: AlertCircle },
};

function CopyableValue({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          // ignore — clipboard might be blocked
        }
      }}
      className="group inline-flex items-center gap-1.5 rounded border bg-muted/40 px-2 py-1 font-mono text-xs hover:bg-muted"
      aria-label={`Copy ${value}`}
    >
      <span className="truncate">{value}</span>
      <Copy className="h-3 w-3 shrink-0 opacity-50 group-hover:opacity-100" />
      {copied && <span className="text-emerald-600 text-[10px]">Copied</span>}
    </button>
  );
}

export function CustomDomainsManager({ guidebookId, guidebookSlug }: Props) {
  const [domains, setDomains] = useState<CustomDomain[]>([]);
  const [loading, setLoading] = useState(true);
  const [addInput, setAddInput] = useState("");
  const [adding, setAdding] = useState(false);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const { requestConfirmation } = useFeedbackDialog();

  const setBusy = (id: string, busy: boolean) => {
    setBusyIds((prev) => {
      const next = new Set(prev);
      if (busy) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const fetchDomains = useCallback(async () => {
    const result = await apiFetch<CustomDomain[]>(
      `/api/guidebooks/${guidebookId}/domains`
    );
    setLoading(false);
    if (!result.ok) {
      toastApiError(result.error, {
        title: "Couldn't load custom domains",
        // eslint-disable-next-line react-hooks/immutability
        onRetry: () => void fetchDomains(),
      });
      return;
    }
    setDomains(result.data);
  }, [guidebookId]);

  useEffect(() => {
    void fetchDomains();
  }, [fetchDomains]);

  // Poll status for any domain that's verified-but-not-active (TLS still
  // issuing). Stop polling when all domains are settled.
  useEffect(() => {
    const inFlight = domains.filter((d) => d.status === "verified" || d.status === "error");
    if (inFlight.length === 0) return;

    let cancelled = false;
    const interval = window.setInterval(async () => {
      for (const d of inFlight) {
        if (cancelled) return;
        const result = await apiFetch<{
          status: CustomDomain["status"];
          sslStatus: CustomDomain["sslStatus"];
          sslError: string | null;
        }>(`/api/guidebooks/${guidebookId}/domains/${d.id}/status`);
        if (!result.ok) continue;
        setDomains((prev) =>
          prev.map((row) =>
            row.id === d.id
              ? {
                  ...row,
                  status: result.data.status,
                  sslStatus: result.data.sslStatus,
                  sslError: result.data.sslError,
                }
              : row
          )
        );
      }
    }, 5000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [domains, guidebookId]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addInput.trim()) return;
    setAdding(true);
    const result = await apiFetch<CustomDomain>(
      `/api/guidebooks/${guidebookId}/domains`,
      {
        method: "POST",
        body: { domain: addInput.trim() },
      }
    );
    setAdding(false);
    if (!result.ok) {
      toastApiError(result.error, { title: "Couldn't add domain" });
      return;
    }
    setAddInput("");
    setDomains((prev) => [result.data, ...prev]);
    toast.success(`Added ${result.data.domain}`);
  };

  const handleVerify = async (domain: CustomDomain) => {
    setBusy(domain.id, true);
    const result = await apiFetch(
      `/api/guidebooks/${guidebookId}/domains/${domain.id}/verify`,
      { method: "POST" }
    );
    setBusy(domain.id, false);
    if (!result.ok) {
      toastApiError(result.error, { title: "Verification failed" });
      return;
    }
    toast.success("DNS verified — issuing TLS certificate…");
    void fetchDomains();
  };

  const handleDelete = async (domain: CustomDomain) => {
    const confirmed = await requestConfirmation({
      title: `Remove ${domain.domain}?`,
      description:
        "This disconnects the domain from this guidebook. Your DNS records will remain at your registrar until you remove them there.",
      confirmLabel: "Remove domain",
      tone: "warning",
      busyLabel: "Removing...",
    });
    if (!confirmed) return;
    setBusy(domain.id, true);
    const toastId = toast.loading(`Removing ${domain.domain}...`);
    const result = await apiFetch(
      `/api/guidebooks/${guidebookId}/domains/${domain.id}`,
      { method: "DELETE", parseJson: false }
    );
    setBusy(domain.id, false);
    if (!result.ok) {
      toastApiError(result.error, {
        id: toastId,
        title: "Couldn't remove domain",
      });
      return;
    }
    setDomains((prev) => prev.filter((d) => d.id !== domain.id));
    toast.success("Domain removed", {
      id: toastId,
      description: `${domain.domain} is no longer connected to this guidebook.`,
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-4">
          <form onSubmit={handleAdd} className="flex flex-col gap-3 sm:flex-row">
            <Input
              value={addInput}
              onChange={(e) => setAddInput(e.target.value)}
              placeholder="guide.acmehouse.com or acmehouse.com"
              autoComplete="off"
              spellCheck={false}
              disabled={adding}
              className="flex-1"
            />
            <Button type="submit" disabled={adding || !addInput.trim()}>
              {adding ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Plus className="mr-1.5 h-3.5 w-3.5" />
              )}
              Add domain
            </Button>
          </form>
          <p className="mt-2 text-xs text-muted-foreground">
            You can connect a subdomain (<code>guide.yoursite.com</code>) or
            your apex domain (<code>yoursite.com</code>). Subdomains use a
            CNAME; apex domains use ALIAS/ANAME/CNAME flattening or A records
            when your DNS provider requires them. Add <code>www</code> as a
            separate domain if you want both.
          </p>
        </CardContent>
      </Card>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      ) : domains.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-10 text-center">
            <Globe className="mb-3 h-8 w-8 text-muted-foreground" />
            <h3 className="text-base font-semibold">No custom domains yet</h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Without a custom domain, your guidebook is reachable at{" "}
              <code>/g/{guidebookSlug}</code>. Add one above to brand it.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {domains.map((domain) => {
            const status = STATUS_COPY[domain.status];
            const StatusIcon = status.icon;
            const busy = busyIds.has(domain.id);
            return (
              <Card key={domain.id}>
                <CardContent className="space-y-3 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{domain.domain}</span>
                        <span className="text-xs text-muted-foreground">
                          ({domain.domainKind})
                        </span>
                        <Badge variant={status.tone}>
                          <StatusIcon
                            className={`mr-1 h-3 w-3 ${
                              domain.status === "verified" ? "animate-spin" : ""
                            }`}
                          />
                          {status.label}
                        </Badge>
                      </div>
                      {domain.status === "active" && (
                        <a
                          href={withHostPreviewParam(`https://${domain.domain}`)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                        >
                          Live at https://{domain.domain}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                      {domain.sslError && (
                        <p className="text-xs text-destructive">
                          {domain.sslError}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {domain.status === "pending" && (
                        <Button
                          size="sm"
                          onClick={() => void handleVerify(domain)}
                          disabled={busy}
                        >
                          {busy ? (
                            <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                          ) : null}
                          Verify
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => void handleDelete(domain)}
                        disabled={busy}
                        aria-label="Remove domain"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {domain.status === "pending" && (
                    <div className="rounded border bg-muted/30 p-3 space-y-3 text-xs">
                      <p className="font-medium">
                        Add these DNS records at your domain registrar:
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        The Name / host value matches what most DNS dashboards
                        ask for. For root domains, use <code>@</code> when
                        your provider supports it; some providers label the
                        same field as blank, root, or the full domain.
                      </p>
                      {[
                        ...domain.dnsInstructions,
                        ...(domain.verificationTxt ? [domain.verificationTxt] : []),
                      ].map((rec, i) => (
                        <div
                          key={i}
                          className="grid grid-cols-1 gap-2 sm:grid-cols-[80px_1fr_1fr]"
                        >
                          <div className="font-mono text-[11px] uppercase text-muted-foreground">
                            {rec.recordType}
                          </div>
                          <div className="space-y-1">
                            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                              Name / host
                            </div>
                            <CopyableValue value={rec.name} />
                          </div>
                          <div className="space-y-1">
                            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                              Value
                            </div>
                            <CopyableValue value={rec.value} />
                          </div>
                          {rec.description && (
                            <div className="col-span-full text-[11px] text-muted-foreground">
                              {rec.description}
                            </div>
                          )}
                        </div>
                      ))}
                      <p className="text-[11px] text-muted-foreground">
                        DNS changes can take a few minutes to propagate. Once
                        they&apos;re live, click <strong>Verify</strong>.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
