"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Sparkles } from "lucide-react";
import { ChatMessage } from "./ChatMessage";
import type { ChatMessage as Msg } from "./types";

type Props = {
  messages: Msg[];
  hostFirstName?: string;
  typing?: boolean;
  intro?: ReactNode;
  forceScrollToken?: number;
};

export function ChatMessageList({
  messages,
  hostFirstName,
  typing = false,
  intro,
  forceScrollToken = 0,
}: Props) {
  const endRef = useRef<HTMLDivElement | null>(null);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const last = messages[messages.length - 1];

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller || !endRef.current) return;
    const nearBottom =
      scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight < 120;
    if (nearBottom) {
      endRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages.length, last?.content?.length, typing]);

  useEffect(() => {
    if (!endRef.current) return;
    const scroller = scrollerRef.current;
    if (scroller) {
      scroller.scrollTop = scroller.scrollHeight;
      return;
    }
    endRef.current.scrollIntoView({ behavior: "auto", block: "end" });
  }, [forceScrollToken]);

  return (
    <div ref={scrollerRef} className="gnx-chat-body">
      {intro}
      {messages.map((m) => (
        <ChatMessage
          key={m.id}
          message={m}
          hostFirstName={hostFirstName}
        />
      ))}
      {typing && (
        <div className="gnx-chat-msg gnx-chat-msg--ai" aria-live="polite">
          <span className="gnx-chat-role-chip gnx-chat-role-chip--ai">
            <Sparkles size={10} aria-hidden /> AI Concierge
          </span>
          <div className="gnx-chat-typing" aria-label="AI is typing">
            <span />
            <span />
            <span />
          </div>
        </div>
      )}
      <div ref={endRef} />
    </div>
  );
}
