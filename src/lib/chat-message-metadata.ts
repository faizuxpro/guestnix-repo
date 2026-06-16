export type ChatTarget = "ai" | "host";

export type ChatMessageMetadata = {
  guestTarget?: ChatTarget;
  aiReplyTo?: string;
};

export function guestTargetMetadata(target: ChatTarget): ChatMessageMetadata {
  return { guestTarget: target };
}

export function aiReplyMetadata(guestMessageId: string): ChatMessageMetadata {
  return { aiReplyTo: guestMessageId };
}

export function readGuestTarget(value: unknown): ChatTarget | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  const target = (value as ChatMessageMetadata).guestTarget;
  return target === "ai" || target === "host" ? target : undefined;
}

export function readAiReplyTo(value: unknown): string | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  const replyTo = (value as ChatMessageMetadata).aiReplyTo;
  return typeof replyTo === "string" && replyTo.length > 0
    ? replyTo
    : undefined;
}
