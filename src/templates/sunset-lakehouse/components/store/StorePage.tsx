"use client";

/* eslint-disable @next/next/no-img-element */

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { Minus, Plus, Send, ShoppingBag } from "lucide-react";
import { useChatStore } from "@/stores/chat-store";
import { trackEvent } from "@/lib/analytics/track";
import {
  readGuestIdentity,
  writeGuestIdentity,
  type GuestIdentity,
} from "@/lib/guest-identity";
import {
  STORE_REQUESTS_UPDATED_EVENT,
  hasUnreadStoreRequestUpdate,
  readSavedStoreRequests,
  saveStoreRequestLink,
  type SavedStoreRequest,
} from "@/lib/store/guest-request-cache";
import { formatStoreMoney, getPublicStorefrontItems } from "@/lib/store/public";
import {
  DEFAULT_STORE_INTRO_SETTINGS,
  DEFAULT_STORE_LISTING_STYLE,
} from "@/lib/store/settings";
import { editorInspectAttributes } from "@/lib/editor-inspect";
import {
  PUBLIC_GUIDEBOOK_BASE_PATH,
  type GuidebookPublicBasePath,
} from "@/lib/guidebook-public-url";
import type { SnapshotStorefront, SnapshotStorefrontItem } from "@/lib/store/types";

type Props = {
  guidebookId: string;
  guidebookSlug: string;
  publicBasePath?: GuidebookPublicBasePath;
  storefront: SnapshotStorefront;
  isPreview?: boolean;
  highlighted?: boolean;
  highlightedItemId?: string | null;
  footerSlot?: ReactNode;
};

type SubmitState =
  | { status: "idle"; message: string | null; resumeUrl?: undefined }
  | { status: "submitting"; message: string | null; resumeUrl?: undefined }
  | {
      status: "success";
      message: string;
      resumeUrl: string | null;
      confirmationEmailSent: boolean;
    }
  | { status: "error"; message: string; resumeUrl?: undefined };

function clampQuantity(item: SnapshotStorefrontItem, value: number) {
  const max = item.maxQuantity ?? 99;
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(max, Math.floor(value)));
}

function errorMessageFromPayload(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return "Store request could not be submitted.";
  }
  const error = (payload as { error?: unknown }).error;
  if (typeof error === "string") return error;
  if (error && typeof error === "object") {
    for (const value of Object.values(error)) {
      if (Array.isArray(value)) {
        const first = value.find((entry) => typeof entry === "string");
        if (first) return first;
      }
    }
  }
  return "Store request could not be submitted.";
}

export function StorePage({
  guidebookId,
  guidebookSlug,
  publicBasePath = PUBLIC_GUIDEBOOK_BASE_PATH,
  storefront,
  isPreview = false,
  highlighted = false,
  highlightedItemId = null,
  footerSlot,
}: Props) {
  const chatSessionToken = useChatStore((state) => state.sessionToken);
  const chatGuestName = useChatStore((state) => state.guestName);
  const chatGuestEmail = useChatStore((state) => state.guestEmail);
  const setChatGuestIdentity = useChatStore((state) => state.setGuestIdentity);
  const items = useMemo(() => getPublicStorefrontItems(storefront), [storefront]);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [guestNameInput, setGuestNameInput] = useState("");
  const [guestEmailInput, setGuestEmailInput] = useState("");
  const [guestNameEdited, setGuestNameEdited] = useState(false);
  const [guestEmailEdited, setGuestEmailEdited] = useState(false);
  const [guestPhone, setGuestPhone] = useState("");
  const [requestedFor, setRequestedFor] = useState("");
  const [guestNote, setGuestNote] = useState("");
  const [savedRequests, setSavedRequests] = useState<SavedStoreRequest[]>([]);
  const [cachedIdentity, setCachedIdentity] = useState<GuestIdentity | null>(null);
  const [submitState, setSubmitState] = useState<SubmitState>({
    status: "idle",
    message: null,
  });
  const storeViewTrackedRef = useRef(false);
  const showPreviewSetupState =
    isPreview && (!storefront.enabled || items.length === 0);
  const intro = storefront.intro ?? DEFAULT_STORE_INTRO_SETTINGS;
  const listingStyle = storefront.listingStyle ?? DEFAULT_STORE_LISTING_STYLE;
  const showIntro =
    intro.enabled &&
    Boolean(intro.eyebrow.trim() || intro.title.trim() || intro.subtitle.trim());
  const visibleSavedRequests = isPreview ? [] : savedRequests;
  const effectiveCachedIdentity = isPreview ? null : cachedIdentity;
  const guestName = guestNameEdited
    ? guestNameInput
    : guestNameInput || chatGuestName || effectiveCachedIdentity?.guestName || "";
  const guestEmail = guestEmailEdited
    ? guestEmailInput
    : guestEmailInput ||
      chatGuestEmail ||
      effectiveCachedIdentity?.guestEmail ||
      "";

  const selectedItems = useMemo(
    () =>
      items
        .map((item) => ({ item, quantity: quantities[item.id] ?? 0 }))
        .filter((entry) => entry.quantity > 0),
    [items, quantities]
  );

  const subtotal = selectedItems.reduce(
    (sum, entry) => sum + entry.item.priceCents * entry.quantity,
    0
  );
  const currency = selectedItems[0]?.item.currency ?? items[0]?.currency ?? "USD";

  useEffect(() => {
    if (isPreview) return;
    const timer = window.setTimeout(() => {
      setSavedRequests(readSavedStoreRequests(guidebookSlug));
      setCachedIdentity(readGuestIdentity(guidebookSlug));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [guidebookSlug, isPreview]);

  useEffect(() => {
    if (isPreview || storeViewTrackedRef.current || items.length === 0) return;
    storeViewTrackedRef.current = true;
    trackEvent({
      guidebookId,
      eventType: "store_viewed",
      metadata: {
        store_item_count: items.length,
      },
    });
  }, [guidebookId, isPreview, items.length]);

  useEffect(() => {
    if (isPreview) return;
    const handleStoreRequestUpdate = (event: Event) => {
      const custom = event as CustomEvent<{ slug?: string }>;
      if (custom.detail?.slug !== guidebookSlug) return;
      setSavedRequests(readSavedStoreRequests(guidebookSlug));
    };
    window.addEventListener(
      STORE_REQUESTS_UPDATED_EVENT,
      handleStoreRequestUpdate
    );
    return () => {
      window.removeEventListener(
        STORE_REQUESTS_UPDATED_EVENT,
        handleStoreRequestUpdate
      );
    };
  }, [guidebookSlug, isPreview]);

  function setItemQuantity(item: SnapshotStorefrontItem, next: number) {
    const currentQuantity = quantities[item.id] ?? 0;
    const nextQuantity = clampQuantity(item, next);
    if (!isPreview && currentQuantity <= 0 && nextQuantity > 0) {
      trackEvent({
        guidebookId,
        eventType: "store_item_selected",
        metadata: {
          store_item_id: item.id,
          currency: item.currency,
          unit_price_cents: item.priceCents,
        },
      });
    }
    setQuantities((current) => ({
      ...current,
      [item.id]: nextQuantity,
    }));
  }

  async function submitRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isPreview) {
      return;
    }
    if (selectedItems.length === 0) {
      setSubmitState({ status: "error", message: "Choose at least one item." });
      return;
    }
    if (!guestName.trim() || !guestEmail.trim()) {
      setSubmitState({
        status: "error",
        message: "Name and email are required for Store requests.",
      });
      return;
    }

    setSubmitState({ status: "submitting", message: null });

    const requestBody: Record<string, unknown> = {
      items: selectedItems.map(({ item, quantity }) => ({
        storeItemId: item.id,
        quantity,
      })),
      guestName,
      guestEmail,
      guestPhone,
      requestedFor,
      guestNote,
    };

    if (chatSessionToken) {
      requestBody.chatSessionToken = chatSessionToken;
    }

    const response = await fetch(
      `/api/g/${encodeURIComponent(guidebookSlug)}/store/requests`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      }
    );

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = errorMessageFromPayload(payload);
      setSubmitState({ status: "error", message: error });
      return;
    }

    const requestCode =
      typeof payload.request?.requestCode === "string"
        ? payload.request.requestCode
        : "";
    const resumeUrl =
      typeof payload.request?.resumeUrl === "string"
        ? payload.request.resumeUrl.replace(
            `/g/${encodeURIComponent(guidebookSlug)}/`,
            `${publicBasePath}/${encodeURIComponent(guidebookSlug)}/`
          )
        : null;
    const subtotalLabel =
      typeof payload.request?.subtotalLabel === "string"
        ? payload.request.subtotalLabel
        : formatStoreMoney(subtotal, currency);
    const confirmationEmailSent =
      payload.request?.confirmationEmailSent === true;

    trackEvent({
      guidebookId,
      eventType: "store_request_submitted",
      metadata: {
        store_item_count: selectedItems.length,
        quantity: selectedItems.reduce((sum, entry) => sum + entry.quantity, 0),
        subtotal_cents:
          typeof payload.request?.subtotalCents === "number"
            ? payload.request.subtotalCents
            : subtotal,
        currency:
          typeof payload.request?.currency === "string"
            ? payload.request.currency
            : currency,
      },
    });

    if (requestCode && resumeUrl) {
      setSavedRequests(
        saveStoreRequestLink(guidebookSlug, {
          requestCode,
          resumeUrl,
          subtotalLabel,
          submittedAt: new Date().toISOString(),
        })
      );
    }
    const savedGuestName = guestName.trim();
    const savedGuestEmail = guestEmail.trim().toLowerCase();
    const identity = writeGuestIdentity(guidebookSlug, {
      guestName: savedGuestName,
      guestEmail: savedGuestEmail,
      source: "store",
    });
    setCachedIdentity(identity);
    setChatGuestIdentity({
      guestName: savedGuestName,
      guestEmail: savedGuestEmail,
    });

    setSubmitState({
      status: "success",
      message: confirmationEmailSent
        ? `Request ${requestCode} sent. We emailed you the request link.`
        : `Request ${requestCode} sent.`,
      resumeUrl,
      confirmationEmailSent,
    });
    setQuantities({});
    setGuestNote("");
    setRequestedFor("");
  }

  return (
    <section
      className={`sl-store${highlighted ? " sl-search-highlight" : ""}`}
      data-guidebook-search-target="store"
      {...editorInspectAttributes(
        { kind: "featured", view: "store", focus: "page" },
        "Edit store page"
      )}
    >
      {showIntro ? (
        <header
          className="sl-tab-heading"
          {...editorInspectAttributes(
            { kind: "featured", view: "store", focus: "intro" },
            "Edit store intro"
          )}
        >
          {intro.eyebrow.trim() ? (
            <span className="eyebrow">{intro.eyebrow}</span>
          ) : null}
          {intro.title.trim() ? <h2>{intro.title}</h2> : null}
          {intro.subtitle.trim() ? <p>{intro.subtitle}</p> : null}
        </header>
      ) : null}

      {showPreviewSetupState ? (
        <div
          className="sl-store-preview-empty"
          {...editorInspectAttributes(
            { kind: "featured", view: "store", focus: "setup" },
            "Edit store setup"
          )}
        >
          <ShoppingBag aria-hidden="true" />
          <strong>
            {storefront.enabled ? "No visible Store items" : "Store is turned off"}
          </strong>
          <p>
            {storefront.enabled
              ? "Assign active catalog items to preview the public Store page."
              : "Turn Store on in the editor to publish this page."}
          </p>
        </div>
      ) : null}

      {!showPreviewSetupState ? (
      <>
      {visibleSavedRequests.length > 0 ? (
        <div className="sl-store-recent" aria-label="Recent Store requests">
          <div>
            <span>Recent requests</span>
            <strong>{visibleSavedRequests[0].requestCode}</strong>
          </div>
          <div className="sl-store-recent-links">
            {visibleSavedRequests.map((request) => (
              <a
                key={request.resumeUrl}
                href={request.resumeUrl}
                data-store-updated={
                  hasUnreadStoreRequestUpdate(request) ? "true" : "false"
                }
              >
                <span>{request.requestCode}</span>
                {hasUnreadStoreRequestUpdate(request) ? (
                  <em>Updated</em>
                ) : null}
                {request.subtotalLabel ? <small>{request.subtotalLabel}</small> : null}
              </a>
            ))}
          </div>
        </div>
      ) : null}
      <form className="sl-store-layout" onSubmit={submitRequest}>
        <div
          className={`sl-store-items sl-store-items--${listingStyle}`}
          aria-label="Store items"
          {...editorInspectAttributes(
            { kind: "featured", view: "store", focus: "items" },
            "Edit store items"
          )}
        >
          {items.map((item) => {
            const quantity = quantities[item.id] ?? 0;
            const max = item.maxQuantity ?? 99;
            return (
              <article
                key={item.id}
                className={`sl-store-item${
                  highlightedItemId === item.id ? " sl-search-highlight" : ""
                }`}
                data-guidebook-search-target={`store-item-${item.id}`}
                {...editorInspectAttributes(
                  { kind: "featured", view: "store", focus: "items" },
                  "Edit store items"
                )}
              >
                <div className="sl-store-item-image">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt="" loading="lazy" />
                  ) : (
                    <ShoppingBag aria-hidden="true" />
                  )}
                </div>
                <div className="sl-store-item-main">
                  <div className="sl-store-item-heading">
                    <h3>{item.name}</h3>
                    <span>{formatStoreMoney(item.priceCents, item.currency)}</span>
                  </div>
                  {item.description ? <p>{item.description}</p> : null}
                  <div className="sl-store-item-footer">
                    {item.unitLabel ? (
                      <span className="sl-store-unit">{item.unitLabel}</span>
                    ) : (
                      <span aria-hidden="true" />
                    )}
                    <div className="sl-store-stepper">
                      <button
                        type="button"
                        aria-label={`Decrease ${item.name}`}
                        onClick={() => setItemQuantity(item, quantity - 1)}
                        disabled={quantity <= 0}
                      >
                        <Minus size={14} />
                      </button>
                      <input
                        aria-label={`${item.name} quantity`}
                        type="number"
                        min={0}
                        max={max}
                        value={quantity}
                        onChange={(event) =>
                          setItemQuantity(item, Number(event.target.value))
                        }
                      />
                      <button
                        type="button"
                        aria-label={`Increase ${item.name}`}
                        onClick={() => setItemQuantity(item, quantity + 1)}
                        disabled={quantity >= max}
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        <aside className="sl-store-request">
          <div className="sl-store-summary">
            <div>
              <span>Subtotal</span>
              <strong>{formatStoreMoney(subtotal, currency)}</strong>
            </div>
          </div>

          <div className="sl-store-fields">
            <label>
              <span>Name</span>
              <input
                value={guestName}
                onChange={(event) => {
                  setGuestNameEdited(true);
                  setGuestNameInput(event.target.value);
                }}
                autoComplete="name"
                required
              />
            </label>
            <label>
              <span>Email</span>
              <input
                value={guestEmail}
                onChange={(event) => {
                  setGuestEmailEdited(true);
                  setGuestEmailInput(event.target.value);
                }}
                autoComplete="email"
                type="email"
                required
              />
            </label>
            <label>
              <span>Phone</span>
              <input
                value={guestPhone}
                onChange={(event) => setGuestPhone(event.target.value)}
                autoComplete="tel"
              />
            </label>
            <label>
              <span>Requested for</span>
              <input
                value={requestedFor}
                onChange={(event) => setRequestedFor(event.target.value)}
                type="datetime-local"
              />
            </label>
            <label className="sl-store-field-wide">
              <span>Message</span>
              <textarea
                value={guestNote}
                onChange={(event) => setGuestNote(event.target.value)}
                rows={4}
              />
            </label>
          </div>

          <button
            className="sl-store-submit"
            type="submit"
            disabled={submitState.status === "submitting"}
          >
            <Send size={16} />
            <span>
              {submitState.status === "submitting" ? "Sending" : "Send request"}
            </span>
          </button>

          {submitState.message ? (
            <div
              className={`sl-store-status sl-store-status--${submitState.status}`}
              role={submitState.status === "error" ? "alert" : "status"}
            >
              {submitState.message}
              {submitState.status === "success" && submitState.resumeUrl ? (
                <a href={submitState.resumeUrl}>Open request thread</a>
              ) : null}
            </div>
          ) : null}
        </aside>
      </form>
      </>
      ) : null}
      {footerSlot}
    </section>
  );
}
