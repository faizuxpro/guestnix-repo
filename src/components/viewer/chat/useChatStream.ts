"use client";

import { useCallback } from "react";
import { useChatStore } from "@/stores/chat-store";

/**
 * Opens an SSE connection to /stream and feeds tokens into the chat store.
 * Returns a promise that resolves when the stream ends.
 */
export function useChatStream() {
  const appendStreamingToken = useChatStore((s) => s.appendStreamingToken);
  const finalizeStreamingMessage = useChatStore(
    (s) => s.finalizeStreamingMessage
  );
  const setAiResponding = useChatStore((s) => s.setAiResponding);
  const setConnectionStatus = useChatStore((s) => s.setConnectionStatus);
  const setError = useChatStore((s) => s.setError);

  const start = useCallback(
    async (
      sessionToken: string,
      messageId: string,
      lang?: string
    ) => {
      setAiResponding(true);
      setConnectionStatus("connecting");
      setError(null);

      const provisionalId = `ai_pending_${messageId}`;
      let finalId: string | null = null;

      const params = new URLSearchParams({ messageId });
      if (lang) params.set("lang", lang);
      const response = await fetch(
        `/api/chat/${sessionToken}/stream?${params.toString()}`
      );
      if (!response.ok || !response.body) {
        setConnectionStatus("error");
        setAiResponding(false);
        setError(`Connection failed (${response.status})`);
        return;
      }
      setConnectionStatus("open");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      const processEvent = (event: string, data: string) => {
        try {
          const parsed = JSON.parse(data);
          if (event === "token") {
            appendStreamingToken(
              provisionalId,
              (parsed as { content: string }).content
            );
          } else if (event === "done") {
            finalId = (parsed as { messageId: string }).messageId;
          } else if (event === "error") {
            setError((parsed as { message: string }).message);
          }
        } catch (err) {
          console.warn("SSE parse failed", err, event, data);
        }
      };

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          let sep: number;
          while ((sep = buffer.indexOf("\n\n")) !== -1) {
            const frame = buffer.slice(0, sep);
            buffer = buffer.slice(sep + 2);
            const lines = frame.split("\n");
            let event = "message";
            let data = "";
            for (const line of lines) {
              if (line.startsWith("event: ")) event = line.slice(7).trim();
              else if (line.startsWith("data: ")) data += line.slice(6);
            }
            if (data) processEvent(event, data);
          }
        }
      } catch (err) {
        console.error("SSE read failed", err);
        setError(err instanceof Error ? err.message : "Stream failed");
      }

      if (finalId) {
        finalizeStreamingMessage(provisionalId, {
          id: finalId,
          toolCalls: null,
        });
      } else {
        finalizeStreamingMessage(provisionalId);
      }
      setAiResponding(false);
      setConnectionStatus("idle");
    },
    [
      appendStreamingToken,
      finalizeStreamingMessage,
      setAiResponding,
      setConnectionStatus,
      setError,
    ]
  );

  return { start };
}
