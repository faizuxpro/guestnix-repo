"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type FormEvent,
} from "react";
import { Icon } from "@iconify/react";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  CreditCard,
  FileCheck2,
  MessageSquare,
  PackageCheck,
  Send,
  ShoppingBag,
  Upload,
  XCircle,
} from "lucide-react";
import { trackEvent } from "@/lib/analytics/track";
import { writeGuestIdentity } from "@/lib/guest-identity";
import {
  saveStoreRequestLink,
} from "@/lib/store/guest-request-cache";
import { createBrowserClient } from "@/lib/supabase/client";
import { normalizeSafeUrl } from "@/lib/safe-url";
import {
  getStorePaymentMethodMeta,
  type StorePaymentMethod,
} from "@/lib/store/payment-methods";
import { useChatStore } from "@/stores/chat-store";
import {
  PUBLIC_GUIDEBOOK_BASE_PATH,
  type GuidebookPublicBasePath,
} from "@/lib/guidebook-public-url";

type StoreRequestDetail = {
  id: string;
  guidebookId: string;
  requestCode: string;
  guidebookTitle: string;
  guidebookSlug: string;
  guestName: string;
  guestEmail: string;
  status: string;
  paymentStatus: string;
  paymentInstructions: string | null;
  paymentMethods: StorePaymentMethod[];
  subtotalLabel: string;
  requestedFor: string | null;
  hostNote: string | null;
  acceptedAt: string | null;
  paymentProofUrl: string | null;
  paymentProofNote: string | null;
  paymentProofSubmittedAt: string | null;
  paymentConfirmedAt: string | null;
  fulfilledAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
  items: Array<{
    id: string;
    itemName: string;
    quantity: number;
    lineTotalLabel: string;
  }>;
  messages: Array<{
    id: string;
    authorType: "guest" | "host" | string;
    content: string;
    createdAt: string;
  }>;
};

type Props = {
  slug: string;
  token: string;
  publicBasePath?: GuidebookPublicBasePath;
};

function statusLabel(value: string) {
  return value.replaceAll("_", " ");
}

function formatRequestDateTime(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function statusToneClasses(status: string) {
  if (status === "fulfilled") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }
  if (status === "accepted") {
    return "border-sky-200 bg-sky-50 text-sky-800";
  }
  if (status === "cancelled") {
    return "border-red-200 bg-red-50 text-red-800";
  }
  return "border-amber-200 bg-amber-50 text-amber-800";
}

function paymentToneClasses(status: string) {
  if (status === "external_paid") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }
  if (status === "proof_submitted") {
    return "border-blue-200 bg-blue-50 text-blue-800";
  }
  if (status === "not_required") {
    return "border-neutral-200 bg-neutral-50 text-neutral-700";
  }
  return "border-orange-200 bg-orange-50 text-orange-800";
}

function isUploadedProofValue(value: string) {
  return value.startsWith("store-proof:");
}

function isApproved(request: StoreRequestDetail) {
  return request.status === "accepted" || request.status === "fulfilled";
}

function progressSteps(request: StoreRequestDetail) {
  const noPayment = request.paymentStatus === "not_required";
  const proofSubmitted =
    request.paymentStatus === "proof_submitted" ||
    request.paymentStatus === "external_paid";
  const paymentConfirmed =
    request.paymentStatus === "external_paid" || noPayment;
  const cancelled = request.status === "cancelled";

  return [
    {
      label: "Request sent",
      description: "Your request is with the host.",
      complete: true,
      active: request.status === "new" && !cancelled,
    },
    {
      label: "Host approval",
      description: cancelled
        ? "The host cancelled this request."
        : isApproved(request)
          ? "The host approved this request."
          : "Waiting for the host to accept or adjust it.",
      complete: isApproved(request),
      active: request.status === "new" && !cancelled,
      blocked: cancelled,
    },
    {
      label: noPayment ? "Payment skipped" : "Payment proof",
      description: noPayment
        ? "No payment is required."
        : proofSubmitted
          ? "Payment proof was sent to the host."
          : isApproved(request)
            ? "Send payment proof after paying externally."
            : "Available after host approval.",
      complete: noPayment || proofSubmitted,
      active:
        !noPayment &&
        isApproved(request) &&
        request.paymentStatus === "external_pending" &&
        !cancelled,
      blocked: cancelled,
    },
    {
      label: "Host confirms",
      description: noPayment
        ? "Payment confirmation is not needed."
        : paymentConfirmed
          ? "Payment has been confirmed."
          : proofSubmitted
            ? "Waiting for host confirmation."
            : "Comes after payment proof.",
      complete: paymentConfirmed,
      active:
        !noPayment &&
        request.paymentStatus === "proof_submitted" &&
        !cancelled,
      blocked: cancelled,
    },
    {
      label: "Delivered",
      description:
        request.status === "fulfilled"
          ? "The host marked this request fulfilled."
          : paymentConfirmed
            ? "The host will deliver the item or service."
            : "Final delivery step.",
      complete: request.status === "fulfilled",
      active:
        request.status === "accepted" &&
        paymentConfirmed &&
        !cancelled,
      blocked: cancelled,
    },
  ];
}

function currentRequestStage(request: StoreRequestDetail) {
  if (request.status === "cancelled") {
    return {
      icon: XCircle,
      eyebrow: "Request stopped",
      title: "This request was cancelled",
      description:
        "The host cannot continue this request. You can still message them if you need help.",
      tone: "danger" as const,
    };
  }
  if (request.status === "fulfilled") {
    return {
      icon: PackageCheck,
      eyebrow: "All done",
      title: "Your request has been delivered",
      description:
        "The host marked this item or service as handled. The thread stays here for your records.",
      tone: "success" as const,
    };
  }
  if (request.status === "new") {
    return {
      icon: Clock3,
      eyebrow: "Waiting on host",
      title: "Your host is reviewing this request",
      description:
        "You will see payment details here after the host approves it. Send a message if timing matters.",
      tone: "waiting" as const,
    };
  }
  if (request.paymentStatus === "proof_submitted") {
    return {
      icon: FileCheck2,
      eyebrow: "Proof sent",
      title: "Waiting for host payment confirmation",
      description:
        "Your proof is attached to the request. The host will confirm it before delivery.",
      tone: "info" as const,
    };
  }
  if (request.paymentStatus === "external_pending") {
    return {
      icon: CreditCard,
      eyebrow: "Action needed",
      title: "Pay externally, then submit proof",
      description:
        "Use the host's payment details below. Upload a receipt, screenshot, link, or reference note when done.",
      tone: "action" as const,
    };
  }
  return {
    icon: PackageCheck,
    eyebrow: "In progress",
    title: "Payment is settled",
    description:
      "The host has what they need and will mark this delivered after handling the request.",
    tone: "ready" as const,
  };
}

function stageToneClasses(tone: ReturnType<typeof currentRequestStage>["tone"]) {
  if (tone === "success") {
    return "border-emerald-200 bg-emerald-50 text-emerald-950";
  }
  if (tone === "danger") {
    return "border-red-200 bg-red-50 text-red-950";
  }
  if (tone === "action") {
    return "border-[#d9a64a]/45 bg-[#fff8e9] text-[#3a2a12]";
  }
  if (tone === "info") {
    return "border-blue-200 bg-blue-50 text-blue-950";
  }
  if (tone === "ready") {
    return "border-sky-200 bg-sky-50 text-sky-950";
  }
  return "border-amber-200 bg-amber-50 text-amber-950";
}

export function StoreRequestClient({
  slug,
  token,
  publicBasePath = PUBLIC_GUIDEBOOK_BASE_PATH,
}: Props) {
  const supabase = useMemo(() => createBrowserClient(), []);
  const setGuestIdentity = useChatStore((state) => state.setGuestIdentity);
  const [request, setRequest] = useState<StoreRequestDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [paymentProofUrl, setPaymentProofUrl] = useState("");
  const [paymentProofNote, setPaymentProofNote] = useState("");
  const [paymentProofFileName, setPaymentProofFileName] = useState("");
  const [proofSending, setProofSending] = useState(false);
  const [proofUploading, setProofUploading] = useState(false);
  const openedTrackedRequestIds = useRef<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const response = await fetch(
      `/api/g/${encodeURIComponent(slug)}/store/requests/${encodeURIComponent(
        token
      )}`
    );
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(
        typeof payload.error === "string"
          ? payload.error
          : "Store request could not be loaded."
      );
      setRequest(null);
      setLoading(false);
      return;
    }

    const loadedRequest = payload.request as StoreRequestDetail;
    setRequest(loadedRequest);
    if (!openedTrackedRequestIds.current.has(loadedRequest.id)) {
      openedTrackedRequestIds.current.add(loadedRequest.id);
      trackEvent({
        guidebookId: loadedRequest.guidebookId,
        eventType: "store_request_opened",
        metadata: {
          request_status: loadedRequest.status,
          payment_status: loadedRequest.paymentStatus,
        },
      });
    }
    writeGuestIdentity(slug, {
      guestName: loadedRequest.guestName,
      guestEmail: loadedRequest.guestEmail,
      source: "store",
    });
    setGuestIdentity({
      guestName: loadedRequest.guestName,
      guestEmail: loadedRequest.guestEmail,
    });
    if (typeof window !== "undefined") {
      saveStoreRequestLink(slug, {
        requestCode: loadedRequest.requestCode,
        resumeUrl: window.location.href,
        subtotalLabel: loadedRequest.subtotalLabel,
        submittedAt: loadedRequest.createdAt,
        lastKnownUpdatedAt: loadedRequest.updatedAt,
        lastSeenAt: loadedRequest.updatedAt,
      });
    }
    setPaymentProofUrl(loadedRequest.paymentProofUrl ?? "");
    setPaymentProofNote(loadedRequest.paymentProofNote ?? "");
    setPaymentProofFileName("");
    setLoading(false);
  }, [setGuestIdentity, slug, token]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    if (!request?.id) return;
    const channel = supabase.channel(`store_request:${request.id}`);
    channel.on("broadcast", { event: "request_update" }, () => {
      void load();
    });
    channel.subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [load, request?.id, supabase]);

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!message.trim()) return;
    setSending(true);
    setError(null);

    const response = await fetch(
      `/api/g/${encodeURIComponent(slug)}/store/requests/${encodeURIComponent(
        token
      )}/messages`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: message }),
      }
    );
    const payload = await response.json().catch(() => ({}));
    setSending(false);
    if (!response.ok) {
      setError(
        typeof payload.error === "string"
          ? payload.error
          : "Message could not be sent."
      );
      return;
    }
    setMessage("");
    if (request) {
      trackEvent({
        guidebookId: request.guidebookId,
        eventType: "store_message_sent",
        metadata: {
          source: "guest",
          request_status: request.status,
          payment_status: request.paymentStatus,
        },
      });
    }
    await load();
  }

  async function submitPaymentProof(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!paymentProofUrl.trim() && !paymentProofNote.trim()) {
      setError("Add a payment proof file, link, or reference note.");
      return;
    }

    setProofSending(true);
    setError(null);
    const response = await fetch(
      `/api/g/${encodeURIComponent(slug)}/store/requests/${encodeURIComponent(
        token
      )}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentProofUrl,
          paymentProofNote,
        }),
      }
    );
    const payload = await response.json().catch(() => ({}));
    setProofSending(false);
    if (!response.ok) {
      setError(
        typeof payload.error === "string"
          ? payload.error
          : "Payment proof could not be submitted."
      );
      return;
    }

    if (request) {
      trackEvent({
        guidebookId: request.guidebookId,
        eventType: "store_payment_proof_submitted",
        metadata: {
          source: "guest",
          request_status: request.status,
          payment_status: "proof_submitted",
        },
      });
    }
    await load();
  }

  async function uploadPaymentProofFile(file: File | null) {
    if (!file) return;

    setProofUploading(true);
    setError(null);
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(
      `/api/g/${encodeURIComponent(slug)}/store/requests/${encodeURIComponent(
        token
      )}/proof`,
      {
        method: "POST",
        body: formData,
      }
    );
    const payload = await response.json().catch(() => ({}));
    setProofUploading(false);

    if (!response.ok) {
      setError(
        typeof payload.error === "string"
          ? payload.error
          : "Payment proof file could not be uploaded."
      );
      return;
    }

    setPaymentProofUrl(
      typeof payload.proofUrl === "string" ? payload.proofUrl : ""
    );
    setPaymentProofFileName(
      typeof payload.fileName === "string" ? payload.fileName : file.name
    );
  }

  return (
    <main className="min-h-screen bg-[#f4efe6] px-4 py-5 text-[#162522] sm:py-8">
      <div className="mx-auto grid w-full max-w-5xl gap-4">
        <a
          href={`${publicBasePath}/${encodeURIComponent(slug)}#store`}
          className="inline-flex min-h-10 w-fit items-center gap-2 rounded-md border border-black/10 bg-white px-3 py-2 text-sm font-semibold text-[#162522] shadow-sm transition hover:border-[#b5812f]/40"
        >
          <ArrowLeft size={16} />
          Back to Store
        </a>

        <section className="rounded-lg border border-black/10 bg-white p-4 shadow-sm sm:p-5">
          {loading ? (
            <div className="grid min-h-[420px] place-items-center text-sm text-neutral-500">
              Loading request...
            </div>
          ) : error && !request ? (
            <div className="grid min-h-[320px] place-items-center text-center">
              <div>
                <AlertCircle className="mx-auto h-8 w-8 text-red-700" />
                <p className="mt-3 text-sm font-semibold text-red-700">
                  {error}
                </p>
              </div>
            </div>
          ) : request ? (
            <div className="grid gap-5">
              <RequestHero request={request} />

              <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
                <div className="grid gap-5">
                  <ProgressTracker request={request} />
                  <RequestItemsPanel request={request} />
                  <ThreadPanel
                    request={request}
                    message={message}
                    setMessage={setMessage}
                    sendMessage={sendMessage}
                    sending={sending}
                    error={error}
                  />
                </div>

                <PaymentPanel
                  request={request}
                  paymentProofUrl={paymentProofUrl}
                  paymentProofNote={paymentProofNote}
                  setPaymentProofUrl={setPaymentProofUrl}
                  setPaymentProofNote={setPaymentProofNote}
                  paymentProofFileName={paymentProofFileName}
                  setPaymentProofFileName={setPaymentProofFileName}
                  uploadPaymentProofFile={uploadPaymentProofFile}
                  submitPaymentProof={submitPaymentProof}
                  proofSending={proofSending}
                  proofUploading={proofUploading}
                />
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}

function RequestHero({ request }: { request: StoreRequestDetail }) {
  const stage = currentRequestStage(request);
  const StageIcon = stage.icon;
  const submittedAt = formatRequestDateTime(request.createdAt);
  const requestedFor = formatRequestDateTime(request.requestedFor);
  const updatedAt = formatRequestDateTime(request.updatedAt);

  return (
    <header className="overflow-hidden rounded-lg border border-black/10 bg-[#162522] text-white shadow-sm">
      <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_240px]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[#f0c676]">
              {request.requestCode}
            </span>
            <span
              className={`rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${statusToneClasses(
                request.status
              )}`}
            >
              {statusLabel(request.status)}
            </span>
            <span
              className={`rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${paymentToneClasses(
                request.paymentStatus
              )}`}
            >
              {statusLabel(request.paymentStatus)}
            </span>
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-normal sm:text-3xl">
            Store request for {request.guidebookTitle}
          </h1>
          <div
            className={`mt-4 rounded-lg border p-3 ${stageToneClasses(
              stage.tone
            )}`}
          >
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-white/65">
                <StageIcon className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] opacity-70">
                  {stage.eyebrow}
                </p>
                <p className="mt-1 text-base font-bold">{stage.title}</p>
                <p className="mt-1 text-sm leading-6 opacity-80">
                  {stage.description}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid content-start gap-3 rounded-lg border border-white/10 bg-white/10 p-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/60">
              Total
            </p>
            <p className="mt-1 text-3xl font-bold tracking-normal">
              {request.subtotalLabel}
            </p>
          </div>
          <div className="grid gap-2 text-sm">
            <RequestFact icon={Clock3} label="Submitted" value={submittedAt ?? "Unknown"} />
            <RequestFact
              icon={Clock3}
              label="Requested for"
              value={requestedFor ?? "No date set"}
            />
            <RequestFact icon={CheckCircle2} label="Last update" value={updatedAt ?? "Unknown"} />
          </div>
        </div>
      </div>
    </header>
  );
}

function RequestFact({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="grid grid-cols-[18px_minmax(0,1fr)] gap-2 rounded-md bg-white/10 p-2">
      <Icon className="mt-0.5 h-4 w-4 text-[#f0c676]" />
      <span className="min-w-0">
        <span className="block text-[11px] font-semibold uppercase tracking-[0.1em] text-white/55">
          {label}
        </span>
        <span className="mt-0.5 block truncate text-white/90">{value}</span>
      </span>
    </div>
  );
}

function RequestItemsPanel({ request }: { request: StoreRequestDetail }) {
  return (
    <section className="rounded-lg border border-black/10 bg-[#fbfaf7] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-bold uppercase tracking-[0.1em] text-neutral-500">
          Requested items
        </h2>
        <strong className="text-sm">{request.subtotalLabel}</strong>
      </div>
      <div className="mt-3 grid gap-2">
        {request.items.map((item) => (
          <div
            key={item.id}
            className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-md border border-black/10 bg-white p-3"
          >
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-[#f0ece4] text-[#162522]">
                <ShoppingBag size={17} />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">
                  {item.itemName}
                </p>
                <p className="text-xs text-neutral-500">
                  Quantity {item.quantity}
                </p>
              </div>
            </div>
            <strong className="text-sm">{item.lineTotalLabel}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}

function ThreadPanel({
  request,
  message,
  setMessage,
  sendMessage,
  sending,
  error,
}: {
  request: StoreRequestDetail;
  message: string;
  setMessage: (value: string) => void;
  sendMessage: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  sending: boolean;
  error: string | null;
}) {
  return (
    <section className="grid gap-3 rounded-lg border border-black/10 bg-white p-4">
      <div className="flex items-center gap-2">
        <MessageSquare className="h-4 w-4 text-[#b5812f]" />
        <h2 className="text-sm font-bold uppercase tracking-[0.1em] text-neutral-500">
          Messages
        </h2>
      </div>
      <div className="grid gap-2">
        {request.messages.length === 0 ? (
          <div className="rounded-md border border-dashed border-black/10 bg-[#fbfaf7] p-4 text-sm text-neutral-600">
            No messages yet. Use this thread for timing, substitutions, or payment questions.
          </div>
        ) : (
          request.messages.map((entry) => (
            <article
              key={entry.id}
              className={`max-w-[88%] rounded-md p-3 text-sm ${
                entry.authorType === "host"
                  ? "bg-[#162522] text-white"
                  : "ml-auto bg-[#f0ece4] text-[#162522]"
              }`}
            >
              <div className="mb-1 text-xs font-semibold uppercase tracking-[0.08em] opacity-70">
                {entry.authorType === "host" ? "Host" : "You"}
              </div>
              <p className="whitespace-pre-wrap leading-6">{entry.content}</p>
            </article>
          ))
        )}
      </div>
      <form className="grid gap-2" onSubmit={sendMessage}>
        <textarea
          className="min-h-24 rounded-md border border-black/10 bg-white p-3 text-sm outline-none focus:border-[#b5812f]"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Message your host"
        />
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        <button
          type="submit"
          disabled={sending || !message.trim()}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-[#162522] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Send size={16} />
          {sending ? "Sending" : "Send message"}
        </button>
      </form>
    </section>
  );
}

function ProgressTracker({ request }: { request: StoreRequestDetail }) {
  const steps = progressSteps(request);

  return (
    <section className="rounded-lg border border-black/10 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-bold uppercase tracking-[0.1em] text-neutral-500">
          Request progress
        </h2>
        <span className="text-xs font-semibold text-neutral-500">
          Updates live on this page
        </span>
      </div>
      <div className="mt-4 grid gap-3">
        {steps.map((step, index) => {
          const state = step.blocked
            ? "blocked"
            : step.complete
              ? "complete"
              : step.active
                ? "active"
                : "pending";
          const stateLabel =
            state === "complete"
              ? "Done"
              : state === "active"
                ? "Current"
                : state === "blocked"
                  ? "Stopped"
                  : "Waiting";
          return (
            <div
              key={step.label}
              className="grid grid-cols-[32px_minmax(0,1fr)] gap-3"
              aria-current={state === "active" ? "step" : undefined}
            >
              <div className="grid justify-items-center">
                <span
                  className={`grid h-8 w-8 place-items-center rounded-full text-xs font-bold ${
                    state === "complete"
                      ? "bg-[#162522] text-white"
                      : state === "active"
                        ? "bg-[#b5812f] text-white"
                        : state === "blocked"
                          ? "bg-red-100 text-red-700"
                          : "bg-[#e8e0d3] text-neutral-500"
                  }`}
                >
                  {state === "complete" ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : state === "blocked" ? (
                    <XCircle className="h-4 w-4" />
                  ) : (
                    index + 1
                  )}
                </span>
                {index < steps.length - 1 ? (
                  <span className="h-full min-h-7 w-px bg-black/10" />
                ) : null}
              </div>
              <div
                className={`rounded-md border p-3 ${
                  state === "active"
                    ? "border-[#d9a64a]/45 bg-[#fff8e9]"
                    : state === "blocked"
                      ? "border-red-100 bg-red-50"
                      : "border-black/10 bg-[#fbfaf7]"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold">{step.label}</p>
                  <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.08em] text-neutral-500">
                    {stateLabel}
                  </span>
                </div>
                <p className="mt-0.5 text-xs leading-5 text-neutral-600">
                  {step.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function PaymentPanel({
  request,
  paymentProofUrl,
  paymentProofNote,
  setPaymentProofUrl,
  setPaymentProofNote,
  paymentProofFileName,
  setPaymentProofFileName,
  uploadPaymentProofFile,
  submitPaymentProof,
  proofSending,
  proofUploading,
}: {
  request: StoreRequestDetail;
  paymentProofUrl: string;
  paymentProofNote: string;
  setPaymentProofUrl: (value: string) => void;
  setPaymentProofNote: (value: string) => void;
  paymentProofFileName: string;
  setPaymentProofFileName: (value: string) => void;
  uploadPaymentProofFile: (file: File | null) => Promise<void>;
  submitPaymentProof: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  proofSending: boolean;
  proofUploading: boolean;
}) {
  const noPayment = request.paymentStatus === "not_required";
  const approved = isApproved(request);
  const canSubmitProof =
    approved &&
    request.status !== "cancelled" &&
    request.paymentStatus === "external_pending" &&
    !request.paymentProofSubmittedAt;
  const proofLinkValue = isUploadedProofValue(paymentProofUrl)
    ? ""
    : paymentProofUrl;
  const safePaymentProofUrl = normalizeSafeUrl(request.paymentProofUrl, {
    allowRelative: true,
    protocols: new Set(["http:", "https:"]),
  });
  const paymentSettled =
    request.paymentStatus === "external_paid" ||
    request.paymentStatus === "not_required";

  return (
    <section className="rounded-lg border border-black/10 bg-white p-4 lg:sticky lg:top-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-bold uppercase tracking-[0.1em] text-neutral-500">
          Payment and proof
        </h2>
        <span
          className={`rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${paymentToneClasses(
            request.paymentStatus
          )}`}
        >
          {statusLabel(request.paymentStatus)}
        </span>
      </div>
      {noPayment ? (
        <div className="mt-3 rounded-md border border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-700">
          No payment is required for this request. The host can deliver it after approval.
        </div>
      ) : !approved ? (
        <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          Payment details will appear here after the host approves your request.
        </p>
      ) : (
        <div className="mt-3 grid gap-3">
          {paymentSettled ? (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">
              {request.paymentStatus === "external_paid"
                ? "Payment confirmed by host."
                : "Payment is not needed for this request."}
            </div>
          ) : null}

          {request.paymentInstructions ? (
            <div className="rounded-md border border-black/10 bg-[#fbfaf7] p-3 text-sm text-[#162522]">
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.1em] text-neutral-500">
                Host payment instructions
              </p>
              <p className="whitespace-pre-wrap">{request.paymentInstructions}</p>
            </div>
          ) : null}

          {request.paymentMethods.length > 0 ? (
            <div className="grid gap-2">
              {request.paymentMethods.map((method) => (
                <PaymentMethodCard key={method.id} method={method} />
              ))}
            </div>
          ) : !request.paymentInstructions ? (
            <p className="text-sm text-neutral-600">
              Follow the host&apos;s external payment instructions, then send proof below.
            </p>
          ) : null}

          {request.paymentProofSubmittedAt ? (
            <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-950">
              <p className="font-semibold">Payment proof submitted</p>
              <p className="mt-1 text-xs text-blue-800">
                Submitted {formatRequestDateTime(request.paymentProofSubmittedAt) ?? "recently"}.
              </p>
              {safePaymentProofUrl ? (
                <a
                  className="mt-1 block break-all text-[#b5812f] underline"
                  href={safePaymentProofUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open payment proof
                </a>
              ) : null}
              {request.paymentProofNote ? (
                <p className="mt-1 whitespace-pre-wrap text-neutral-600">
                  {request.paymentProofNote}
                </p>
              ) : null}
            </div>
          ) : null}

          {canSubmitProof ? (
            <form
              className="grid gap-2 rounded-md border border-[#d9a64a]/45 bg-[#fff8e9] p-3"
              onSubmit={submitPaymentProof}
            >
              <div>
                <p className="text-sm font-bold text-[#3a2a12]">
                  Send your payment proof
                </p>
                <p className="mt-1 text-xs leading-5 text-[#6f5b34]">
                  A receipt image, PDF, transfer link, or reference note works.
                </p>
              </div>
              <label className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-md border border-black/10 bg-[#fbfaf7] px-4 py-2 text-sm font-semibold text-[#162522]">
                <Upload size={16} />
                {proofUploading ? "Uploading proof" : "Upload image or PDF"}
                <input
                  className="sr-only"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
                  disabled={proofUploading}
                  onChange={(event) => {
                    const file = event.currentTarget.files?.[0] ?? null;
                    event.currentTarget.value = "";
                    void uploadPaymentProofFile(file);
                  }}
                />
              </label>
              {paymentProofFileName || isUploadedProofValue(paymentProofUrl) ? (
                <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800">
                  {paymentProofFileName || "Proof file uploaded"}
                </p>
              ) : null}
              <input
                className="rounded-md border border-black/10 bg-white p-3 text-sm outline-none focus:border-[#b5812f]"
                value={proofLinkValue}
                onChange={(event) => {
                  setPaymentProofFileName("");
                  setPaymentProofUrl(event.target.value);
                }}
                placeholder="Payment proof link, if you prefer"
              />
              <textarea
                className="min-h-20 rounded-md border border-black/10 bg-white p-3 text-sm outline-none focus:border-[#b5812f]"
                value={paymentProofNote}
                onChange={(event) => setPaymentProofNote(event.target.value)}
                placeholder="Payment reference or note"
              />
              <button
                type="submit"
                disabled={
                  proofUploading ||
                  proofSending ||
                  (!paymentProofUrl.trim() && !paymentProofNote.trim())
                }
                className="inline-flex min-h-10 items-center justify-center rounded-md bg-[#162522] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {proofSending ? "Submitting proof" : "Submit payment proof"}
              </button>
            </form>
          ) : null}
        </div>
      )}
    </section>
  );
}

function PaymentMethodCard({ method }: { method: StorePaymentMethod }) {
  const meta = getStorePaymentMethodMeta(method.type);

  return (
    <article className="grid grid-cols-[40px_minmax(0,1fr)] gap-3 rounded-md border border-black/10 bg-[#fbfaf7] p-3 text-sm">
      <span
        className="grid h-10 w-10 place-items-center rounded-md text-white"
        style={{ backgroundColor: meta.hue }}
        aria-hidden
      >
        <Icon icon={meta.icon} className="h-5 w-5" />
      </span>
      <span className="min-w-0">
        <strong className="block truncate text-[#162522]">
          {method.label || meta.label}
        </strong>
        {method.value ? (
          <span className="mt-1 block break-words text-neutral-700">
            {method.value}
          </span>
        ) : null}
        {method.instructions ? (
          <span className="mt-1 block whitespace-pre-wrap text-neutral-600">
            {method.instructions}
          </span>
        ) : null}
      </span>
    </article>
  );
}
