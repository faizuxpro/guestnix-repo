"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { Icon } from "@iconify/react";
import { ArrowLeft, Send, ShoppingBag, Upload } from "lucide-react";
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
    <main className="min-h-screen bg-[#f7f4ee] px-4 py-6 text-[#162522]">
      <div className="mx-auto grid w-full max-w-3xl gap-4">
        <a
          href={`${publicBasePath}/${encodeURIComponent(slug)}#store`}
          className="inline-flex w-fit items-center gap-2 rounded-md border border-black/10 bg-white px-3 py-2 text-sm font-semibold text-[#162522] shadow-sm"
        >
          <ArrowLeft size={16} />
          Store
        </a>

        <section className="rounded-lg border border-black/10 bg-white p-4 shadow-sm">
          {loading ? (
            <p className="text-sm text-neutral-500">Loading request...</p>
          ) : error && !request ? (
            <p className="text-sm text-red-700">{error}</p>
          ) : request ? (
            <div className="grid gap-4">
              <header className="grid gap-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#b5812f]">
                    {request.requestCode}
                  </span>
                  <span className="rounded-full bg-[#eef2ef] px-2.5 py-1 text-xs font-semibold capitalize text-[#162522]">
                    {statusLabel(request.status)}
                  </span>
                </div>
                <h1 className="text-2xl font-bold tracking-normal">
                  Store request for {request.guidebookTitle}
                </h1>
                <p className="text-sm text-neutral-600">
                  Payment: {statusLabel(request.paymentStatus)}
                </p>
              </header>

              <ProgressTracker request={request} />

              <div className="grid gap-2">
                {request.items.map((item) => (
                  <div
                    key={item.id}
                    className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-md border border-black/10 bg-[#fbfaf7] p-3"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-white text-[#162522]">
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
                <div className="flex items-center justify-between border-t border-black/10 pt-3 text-sm">
                  <span className="font-semibold">Subtotal</span>
                  <strong>{request.subtotalLabel}</strong>
                </div>
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

              <div className="grid gap-3 border-t border-black/10 pt-4">
                <h2 className="text-sm font-bold uppercase tracking-[0.1em] text-neutral-500">
                  Thread
                </h2>
                <div className="grid gap-2">
                  {request.messages.length === 0 ? (
                    <p className="text-sm text-neutral-500">No messages yet.</p>
                  ) : (
                    request.messages.map((entry) => (
                      <article
                        key={entry.id}
                        className={`rounded-md p-3 text-sm ${
                          entry.authorType === "host"
                            ? "bg-[#162522] text-white"
                            : "bg-[#f0ece4] text-[#162522]"
                        }`}
                      >
                        <div className="mb-1 text-xs font-semibold uppercase tracking-[0.08em] opacity-70">
                          {entry.authorType === "host" ? "Host" : "You"}
                        </div>
                        <p className="whitespace-pre-wrap">{entry.content}</p>
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
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}

function ProgressTracker({ request }: { request: StoreRequestDetail }) {
  const steps = progressSteps(request);

  return (
    <section className="rounded-lg border border-black/10 bg-[#fbfaf7] p-4">
      <h2 className="text-sm font-bold uppercase tracking-[0.1em] text-neutral-500">
        Request progress
      </h2>
      <div className="mt-4 grid gap-3">
        {steps.map((step, index) => {
          const state = step.blocked
            ? "blocked"
            : step.complete
              ? "complete"
              : step.active
                ? "active"
                : "pending";
          return (
            <div key={step.label} className="grid grid-cols-[28px_minmax(0,1fr)] gap-3">
              <div className="grid justify-items-center">
                <span
                  className={`grid h-7 w-7 place-items-center rounded-full text-xs font-bold ${
                    state === "complete"
                      ? "bg-[#162522] text-white"
                      : state === "active"
                        ? "bg-[#b5812f] text-white"
                        : state === "blocked"
                          ? "bg-red-100 text-red-700"
                          : "bg-[#e8e0d3] text-neutral-500"
                  }`}
                >
                  {index + 1}
                </span>
                {index < steps.length - 1 ? (
                  <span className="h-full min-h-7 w-px bg-black/10" />
                ) : null}
              </div>
              <div className="pb-2">
                <p className="text-sm font-semibold">{step.label}</p>
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

  return (
    <section className="rounded-lg border border-black/10 bg-white p-4">
      <h2 className="text-sm font-bold uppercase tracking-[0.1em] text-neutral-500">
        Payment
      </h2>
      {noPayment ? (
        <p className="mt-2 text-sm text-neutral-600">
          No payment is required for this request.
        </p>
      ) : !approved ? (
        <p className="mt-2 text-sm text-neutral-600">
          Payment details will appear here after the host approves your request.
        </p>
      ) : (
        <div className="mt-3 grid gap-3">
          {request.paymentInstructions ? (
            <div className="rounded-md bg-[#fbfaf7] p-3 text-sm text-[#162522]">
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
            <div className="rounded-md border border-black/10 bg-[#fbfaf7] p-3 text-sm">
              <p className="font-semibold">Payment proof submitted</p>
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

          {request.paymentStatus === "external_paid" ? (
            <p className="rounded-md bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">
              Payment confirmed by host.
            </p>
          ) : canSubmitProof ? (
            <form className="grid gap-2" onSubmit={submitPaymentProof}>
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
