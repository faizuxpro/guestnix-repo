"use client";

import { useState, type KeyboardEvent } from "react";
import { Mic, Plus, Send, Sparkles, UserRound } from "lucide-react";
import type { ChatTarget } from "./types";

type Props = {
  disabled?: boolean;
  mode: ChatTarget;
  onModeChange: (mode: ChatTarget) => void;
  onSend: (content: string, target: ChatTarget) => boolean | Promise<boolean | void> | void;
  placeholder?: string;
  hostFirstName: string;
  guestName: string;
  guestEmail: string;
  onGuestNameChange: (value: string) => void;
  onGuestEmailChange: (value: string) => void;
  needsHostIdentity?: boolean;
  showRecipientToggle?: boolean;
};

export function ChatComposer({
  disabled,
  mode,
  onModeChange,
  onSend,
  placeholder,
  hostFirstName,
  guestName,
  guestEmail,
  onGuestNameChange,
  onGuestEmailChange,
  needsHostIdentity,
  showRecipientToggle = true,
}: Props) {
  const [value, setValue] = useState("");

  const send = async () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    const sent = await onSend(trimmed, mode);
    if (sent !== false) {
      setValue("");
    }
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const targetName = mode === "host" ? hostFirstName || "host" : "AI";
  const missingHostIdentity =
    mode === "host" &&
    Boolean(needsHostIdentity) &&
    (!guestName.trim() || !guestEmail.trim());

  return (
    <div className="gnx-chat-composer">
      {showRecipientToggle && (
        <div className="gnx-chat-recipient" role="group" aria-label="Choose who receives your message">
          <button
            type="button"
            className="gnx-chat-recipient-option"
            data-active={mode === "ai" ? "true" : "false"}
            onClick={() => onModeChange("ai")}
            disabled={disabled && mode !== "ai"}
          >
            <Sparkles size={14} />
            AI
          </button>
          <button
            type="button"
            className="gnx-chat-recipient-option"
            data-active={mode === "host" ? "true" : "false"}
            onClick={() => onModeChange("host")}
            disabled={disabled && mode !== "host"}
          >
            <UserRound size={14} />
            Host
          </button>
        </div>
      )}

      {mode === "host" && needsHostIdentity && (
        <div className="gnx-chat-inline-identity" aria-label="Your contact details for the host">
          <input
            value={guestName}
            onChange={(e) => onGuestNameChange(e.target.value)}
            placeholder="Your name"
            maxLength={80}
            disabled={disabled}
          />
          <input
            value={guestEmail}
            onChange={(e) => onGuestEmailChange(e.target.value)}
            placeholder="Email address"
            type="email"
            maxLength={320}
            disabled={disabled}
          />
        </div>
      )}

      <div className="gnx-chat-row">
        <div className="gnx-chat-input-shell">
          <button
            type="button"
            className="gnx-chat-input-icon"
            aria-label="Attachments coming soon"
            disabled
          >
            <Plus size={16} />
          </button>
          <textarea
            className="gnx-chat-textarea"
            rows={1}
            value={value}
            disabled={disabled}
            placeholder={placeholder ?? (mode === "host" ? `Message ${targetName}...` : "Ask anything...")}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={onKeyDown}
          />
          <button
            type="button"
            className="gnx-chat-input-icon"
            aria-label="Voice input coming soon"
            disabled
          >
            <Mic size={15} />
          </button>
        </div>
        <button
          type="button"
          className="gnx-chat-send"
          disabled={disabled || !value.trim() || missingHostIdentity}
          onClick={send}
          aria-label="Send"
        >
          <Send size={18} />
        </button>
      </div>
      <p className="gnx-chat-disclaimer">
        {mode === "ai"
          ? "AI can make mistakes. Your host may read this conversation."
          : `Sending to ${targetName}.`}
      </p>
    </div>
  );
}
