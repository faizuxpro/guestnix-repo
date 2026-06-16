"use client";

import { Sparkles, UserRound } from "lucide-react";
import { renderMarkdown } from "./markdown";
import type { ChatMessage as Msg } from "./types";

type Props = {
  message: Msg;
  hostFirstName?: string;
};

export function ChatMessage({ message, hostFirstName }: Props) {
  const { role, content, streaming } = message;

  const chip =
    role === "guest" && message.target ? (
      <span className={`gnx-chat-role-chip gnx-chat-role-chip--guest gnx-chat-role-chip--guest-${message.target}`}>
        {message.target === "ai" ? (
          <>
            <Sparkles size={10} aria-hidden /> Sent to AI
          </>
        ) : (
          <>
            <UserRound size={10} aria-hidden /> Sent to Host
          </>
        )}
      </span>
    ) : role === "host" ? (
      <span className="gnx-chat-role-chip gnx-chat-role-chip--host">
        {hostFirstName || "Host"}
      </span>
    ) : role === "ai" ? (
      <span className="gnx-chat-role-chip gnx-chat-role-chip--ai">
        <Sparkles size={10} aria-hidden /> AI Concierge
      </span>
    ) : null;

  const showTyping = streaming && !content;

  return (
    <div className={`gnx-chat-msg gnx-chat-msg--${role}`}>
      {chip}
      {showTyping ? (
        <div className="gnx-chat-typing" aria-label="AI is typing">
          <span />
          <span />
          <span />
        </div>
      ) : (
        <div className={`gnx-chat-bubble gnx-chat-bubble--${role}`}>
          {role === "ai" ? renderMarkdown(content) : content}
        </div>
      )}
    </div>
  );
}
