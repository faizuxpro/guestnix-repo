export type ChatRole = "guest" | "ai" | "host";
export type ChatTarget = "ai" | "host";

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  toolCalls?: unknown | null;
  target?: ChatTarget;
  createdAt: string | Date;
  /** True while the server is still streaming this message. */
  streaming?: boolean;
};

export type ConnectionStatus = "idle" | "connecting" | "open" | "error";
