"use client";

import { useCallback, useEffect, useMemo, useState, type ComponentType } from "react";
import {
  Compass,
  DoorOpen,
  MessageCircle,
  Wifi,
  X,
} from "lucide-react";
import { useChatStore } from "@/stores/chat-store";
import { useChatSession } from "./useChatSession";
import { useChatStream } from "./useChatStream";
import { ChatMessageList } from "./ChatMessageList";
import { ChatComposer } from "./ChatComposer";
import { apiFetch } from "@/lib/api-fetch";
import {
  GUEST_IDENTITY_UPDATED_EVENT,
  readGuestIdentity,
  writeGuestIdentity,
  type GuestIdentity,
} from "@/lib/guest-identity";
import type { ChatMessage, ChatTarget } from "./types";

type Props = {
  open: boolean;
  onClose: () => void;
  guidebookSlug: string;
  propertyName: string;
  hostFirstName: string;
  hostAvatarUrl?: string | null;
  /** Active guest language for the AI to respond in. Omit for base language. */
  language?: string;
};

type SuggestionCard = {
  title: string;
  subtitle: string;
  prompt?: string;
  action?: "contact_host";
  icon: ComponentType<{ size?: number; className?: string }>;
};

const DEFAULT_SUGGESTIONS: SuggestionCard[] = [
  {
    title: "Wi-Fi",
    subtitle: "Password",
    prompt: "What's the Wi-Fi password?",
    icon: Wifi,
  },
  {
    title: "Check-in",
    subtitle: "Arrival",
    prompt: "How do I check in?",
    icon: DoorOpen,
  },
  {
    title: "Nearby",
    subtitle: "Local tips",
    prompt: "What should I do around here?",
    icon: Compass,
  },
];

export function ChatPanel({
  open,
  onClose,
  guidebookSlug,
  propertyName,
  hostFirstName,
  hostAvatarUrl,
  language,
}: Props) {
  const { ensureSession } = useChatSession(guidebookSlug);
  const { start } = useChatStream();
  const sessionId = useChatStore((s) => s.sessionId);
  const sessionToken = useChatStore((s) => s.sessionToken);
  const storedGuestName = useChatStore((s) => s.guestName);
  const storedGuestEmail = useChatStore((s) => s.guestEmail);
  const messages = useChatStore((s) => s.messages);
  const appendMessage = useChatStore((s) => s.appendMessage);
  const replaceMessageId = useChatStore((s) => s.replaceMessageId);
  const removeMessage = useChatStore((s) => s.removeMessage);
  const setSession = useChatStore((s) => s.setSession);
  const setGuestIdentity = useChatStore((s) => s.setGuestIdentity);
  const aiResponding = useChatStore((s) => s.aiResponding);
  const setAiResponding = useChatStore((s) => s.setAiResponding);
  const setError = useChatStore((s) => s.setError);
  const lastError = useChatStore((s) => s.lastError);
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [hostMessage, setHostMessage] = useState("");
  const [contactOpen, setContactOpen] = useState(false);
  const [contactError, setContactError] = useState<string | null>(null);
  const [contactSending, setContactSending] = useState(false);
  const [composerTarget, setComposerTarget] = useState<ChatTarget>("ai");
  const [forceScrollToken, setForceScrollToken] = useState(0);

  useEffect(() => {
    const applyIdentity = (identity: GuestIdentity | null, force = false) => {
      if (!identity) return;
      setGuestIdentity({
        guestName: identity.guestName,
        guestEmail: identity.guestEmail,
      });
      setGuestName((current) =>
        force ? identity.guestName ?? current : current || identity.guestName || ""
      );
      setGuestEmail((current) =>
        force
          ? identity.guestEmail ?? current
          : current || identity.guestEmail || ""
      );
    };

    applyIdentity(readGuestIdentity(guidebookSlug));

    const handleIdentityUpdate = (event: Event) => {
      const custom = event as CustomEvent<{
        slug?: string;
        identity?: GuestIdentity;
      }>;
      if (custom.detail?.slug !== guidebookSlug) return;
      applyIdentity(custom.detail.identity ?? null, true);
    };

    window.addEventListener(
      GUEST_IDENTITY_UPDATED_EVENT,
      handleIdentityUpdate
    );
    return () => {
      window.removeEventListener(
        GUEST_IDENTITY_UPDATED_EVENT,
        handleIdentityUpdate
      );
    };
  }, [guidebookSlug, setGuestIdentity]);

  useEffect(() => {
    if (!guestName && storedGuestName) {
      setGuestName(storedGuestName);
    }
  }, [guestName, storedGuestName]);

  useEffect(() => {
    if (!guestEmail && storedGuestEmail) {
      setGuestEmail(storedGuestEmail);
    }
  }, [guestEmail, storedGuestEmail]);

  const greeting: ChatMessage = useMemo(
    () => ({
      id: "_greeting",
      role: "ai",
      content: `Hi! I'm **${propertyName}**'s AI concierge. Ask me about Wi-Fi, check-in, or local tips. Use **Contact Host** when you need ${hostFirstName} to reply.`,
      createdAt: new Date().toISOString(),
    }),
    [propertyName, hostFirstName]
  );

  const displayedMessages = messages.length > 0 ? messages : [greeting];
  const hasHostIdentity = Boolean(storedGuestName && storedGuestEmail);
  const showRecipientToggle = hasHostIdentity;

  const handleSendToAi = useCallback(
    async (content: string, options?: { fromCard?: boolean }) => {
      setError(null);
      if (options?.fromCard) {
        setForceScrollToken((prev) => prev + 1);
      }
      const tempId = `guest_temp_${Date.now()}`;
      appendMessage({
        id: tempId,
        role: "guest",
        content,
        target: "ai",
        createdAt: new Date().toISOString(),
      });
      setAiResponding(true);
      setForceScrollToken((prev) => prev + 1);
      try {
        const sess = sessionToken
          ? { sessionToken }
          : await ensureSession({ guestName: guestName || null });
        const result = await apiFetch<{
          messageId: string;
          aiWillRespond: boolean;
        }>(`/api/chat/${sess.sessionToken}/messages`, {
          method: "POST",
          body: { content },
        });
        if (!result.ok) {
          removeMessage(tempId);
          setAiResponding(false);
          setError(result.error.message);
          return false;
        }

        replaceMessageId(tempId, {
          id: result.data.messageId,
          role: "guest",
          content,
          target: "ai",
          createdAt: new Date().toISOString(),
        });
        if (result.data.aiWillRespond) {
          await start(sess.sessionToken, result.data.messageId, language);
        } else {
          setAiResponding(false);
        }
        return true;
      } catch (err) {
        removeMessage(tempId);
        setAiResponding(false);
        setError(err instanceof Error ? err.message : "Send failed");
        return false;
      }
    },
    [
      appendMessage,
      ensureSession,
      guestName,
      removeMessage,
      replaceMessageId,
      setAiResponding,
      sessionToken,
      setError,
      start,
      language,
    ]
  );

  const handleSendToHost = useCallback(async (
    content: string,
    options?: { errorSurface?: "global" | "contact" }
  ) => {
    const setHostError = (message: string) => {
      if (options?.errorSurface === "contact") {
        setContactError(message);
        return;
      }
      setError(message);
    };
    setError(null);
    setContactError(null);
    const trimmedName = (guestName || storedGuestName || "").trim();
    const trimmedEmail = (guestEmail || storedGuestEmail || "").trim();
    const trimmedMessage = content.trim();
    const identityKnown = Boolean(storedGuestName && storedGuestEmail);
    if ((!identityKnown && (!trimmedName || !trimmedEmail)) || !trimmedMessage) {
      setHostError("Please add your name, email, and message for the host.");
      return false;
    }

    setContactSending(true);
    const tempId = `host_temp_${Date.now()}`;
    appendMessage({
      id: tempId,
      role: "guest",
      content: trimmedMessage,
      target: "host",
      createdAt: new Date().toISOString(),
    });
    setForceScrollToken((prev) => prev + 1);
    try {
      const sess = sessionToken
        ? { sessionToken, sessionId: sessionId ?? "" }
        : await ensureSession({ guestName: trimmedName });
      const result = await apiFetch<{
        messageId: string;
        createdAt: string;
      }>(`/api/chat/${sess.sessionToken}/session`, {
        method: "PATCH",
        body: {
          guestName: trimmedName,
          guestEmail: trimmedEmail,
          content: trimmedMessage,
        },
      });

      if (!result.ok) {
        removeMessage(tempId);
        setHostError(result.error.message);
        return false;
      }

      replaceMessageId(tempId, {
        id: result.data.messageId,
        role: "guest",
        content: trimmedMessage,
        target: "host",
        createdAt: result.data.createdAt,
      });
      if (sess.sessionId && sess.sessionToken) {
        setSession({
          sessionId: sess.sessionId,
          sessionToken: sess.sessionToken,
          guestName: trimmedName,
          guestEmail: trimmedEmail,
        });
      }
      writeGuestIdentity(guidebookSlug, {
        guestName: trimmedName,
        guestEmail: trimmedEmail,
        source: "chat",
      });
      setGuestIdentity({ guestName: trimmedName, guestEmail: trimmedEmail });
      setComposerTarget("host");
      return true;
    } catch (err) {
      removeMessage(tempId);
      setHostError(err instanceof Error ? err.message : "Couldn't contact host");
      return false;
    } finally {
      setContactSending(false);
    }
  }, [
    ensureSession,
    appendMessage,
    guestEmail,
    guestName,
    guidebookSlug,
    removeMessage,
    replaceMessageId,
    sessionId,
    sessionToken,
    setError,
    setGuestIdentity,
    setSession,
    storedGuestEmail,
    storedGuestName,
  ]);

  const handleComposerSend = useCallback(
    (content: string, target: ChatTarget) => {
      if (target === "host") {
        return handleSendToHost(content);
      }
      return handleSendToAi(content);
    },
    [handleSendToAi, handleSendToHost]
  );

  const handleInitialHostContact = useCallback(async () => {
    setContactError(null);
    const name = guestName.trim();
    const email = guestEmail.trim();
    const message = hostMessage.trim();
    if (!name || !email || !message) {
      setContactError("Please add your name, email, and message for the host.");
      return;
    }
    setContactOpen(false);
    const sent = await handleSendToHost(hostMessage, { errorSurface: "contact" });
    if (!sent) {
      setContactOpen(true);
      return;
    }
    setHostMessage("");
  }, [guestEmail, guestName, handleSendToHost, hostMessage]);

  return (
    <div
      className="gnx-chat-panel"
      data-open={open ? "true" : "false"}
      role="dialog"
      aria-label="AI Concierge chat"
    >
      <header className="gnx-chat-header">
        <div className="gnx-chat-head-text">
          <p className="gnx-chat-title">AI Concierge</p>
          <p className="gnx-chat-sub">
            <span className="gnx-chat-status-dot" aria-hidden />
            {propertyName}
          </p>
        </div>
        <button
          type="button"
          className="gnx-chat-host-card"
          onClick={() => {
            setContactError(null);
            if (hasHostIdentity) {
              setComposerTarget("host");
              return;
            }
            setContactOpen(true);
          }}
          aria-label={`Message ${hostFirstName || "host"}`}
          title={`Message ${hostFirstName || "host"}`}
        >
          <span className="gnx-chat-host-avatar" aria-hidden>
            {hostAvatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={hostAvatarUrl} alt="" />
            ) : (
              <span>{(hostFirstName || "H").slice(0, 1).toUpperCase()}</span>
            )}
          </span>
          <span className="gnx-chat-host-copy">
            <strong>
              <MessageCircle size={12} aria-hidden />
              Host
            </strong>
          </span>
        </button>
        <button
          type="button"
          className="gnx-chat-close"
          onClick={onClose}
          aria-label="Close chat"
        >
          <X size={18} />
        </button>
      </header>

      <div className="gnx-chat-content">
        <ChatMessageList
          messages={displayedMessages}
          hostFirstName={hostFirstName}
          typing={aiResponding && !messages.some((m) => m.streaming)}
          forceScrollToken={forceScrollToken}
          intro={
            <section className="gnx-chat-welcome" aria-label="Quick AI actions">
              <div className="gnx-chat-welcome-pattern" aria-hidden />
              <h2 className="gnx-chat-hero">Ask the concierge</h2>
              <p className="gnx-chat-kicker">
                Fast answers from this guidebook.
              </p>
              <div className="gnx-chat-suggestions">
                {DEFAULT_SUGGESTIONS.map((item) => {
                  const Icon = item.icon;
                  const onClick = item.action === "contact_host"
                    ? () => {
                        setContactError(null);
                        if (hasHostIdentity) {
                          setComposerTarget("host");
                          return;
                        }
                        setContactOpen(true);
                      }
                    : () => item.prompt && handleSendToAi(item.prompt, { fromCard: true });
                  return (
                    <button
                      key={item.title}
                      type="button"
                      className="gnx-chat-suggestion"
                      onClick={onClick}
                      disabled={aiResponding}
                    >
                      <span className="gnx-chat-suggestion-icon" aria-hidden>
                        <Icon size={16} />
                      </span>
                      <span className="gnx-chat-suggestion-title">
                        {item.title}
                      </span>
                      <span className="gnx-chat-suggestion-subtitle">
                        {item.subtitle}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          }
        />
      </div>

      {lastError && <p className="gnx-chat-error">{lastError}</p>}

      {contactOpen && (
        <>
          <button
            type="button"
            className="gnx-chat-contact-backdrop"
            aria-label="Close host message form"
            onClick={() => {
              setContactError(null);
              setContactOpen(false);
            }}
          />
          <section className="gnx-chat-contact" aria-label="Message host">
            <div className="gnx-chat-contact-head">
              <div className="gnx-chat-contact-title">
                <span className="gnx-chat-host-avatar" aria-hidden>
                  {hostAvatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={hostAvatarUrl} alt="" />
                  ) : (
                    <span>{(hostFirstName || "H").slice(0, 1).toUpperCase()}</span>
                  )}
                </span>
                <div>
                  <strong>{`Contact ${hostFirstName || "host"}`}</strong>
                  <p>Start a direct host conversation.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setContactError(null);
                  setContactOpen(false);
                }}
                aria-label="Close form"
              >
                <X size={16} />
              </button>
            </div>
            <input
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              placeholder="Your name"
              maxLength={80}
            />
            <input
              value={guestEmail}
              onChange={(e) => setGuestEmail(e.target.value)}
              placeholder="Email address"
              type="email"
              maxLength={320}
            />
            <textarea
              value={hostMessage}
              onChange={(e) => setHostMessage(e.target.value)}
              placeholder="Message for the host"
              rows={3}
              maxLength={4000}
            />
            <p>Your name and email are shared with the host so they can reply about this stay.</p>
            {contactError && (
              <p className="gnx-chat-contact-error">{contactError}</p>
            )}
            <button
              type="button"
              className="gnx-chat-contact-send"
              onClick={handleInitialHostContact}
              disabled={
                contactSending ||
                aiResponding ||
                !guestName.trim() ||
                !guestEmail.trim() ||
                !hostMessage.trim()
              }
            >
              {contactSending ? "Sending..." : "Send to host"}
            </button>
          </section>
        </>
      )}

      <ChatComposer
        disabled={
          contactOpen
            ? true
            : composerTarget === "host"
            ? contactSending || aiResponding
            : aiResponding
        }
        mode={showRecipientToggle ? composerTarget : "ai"}
        onModeChange={setComposerTarget}
        onSend={handleComposerSend}
        hostFirstName={hostFirstName}
        guestName={guestName}
        guestEmail={guestEmail}
        onGuestNameChange={setGuestName}
        onGuestEmailChange={setGuestEmail}
        needsHostIdentity={showRecipientToggle && !hasHostIdentity}
        showRecipientToggle={showRecipientToggle}
        placeholder={
          composerTarget === "host"
            ? contactSending
              ? "Sending to host..."
              : undefined
            : aiResponding
              ? "AI is thinking..."
              : undefined
        }
      />
    </div>
  );
}
