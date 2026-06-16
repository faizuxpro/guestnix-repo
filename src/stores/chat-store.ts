import { create } from "zustand";
import type {
  ChatMessage,
  ConnectionStatus,
} from "@/components/viewer/chat/types";

interface ChatState {
  sessionId: string | null;
  sessionToken: string | null;
  guestName: string | null;
  guestEmail: string | null;
  aiEnabled: boolean;
  messages: ChatMessage[];
  aiResponding: boolean;
  connectionStatus: ConnectionStatus;
  lastError: string | null;

  setSession: (payload: {
    sessionId: string;
    sessionToken: string;
    guestName?: string | null;
    guestEmail?: string | null;
    aiEnabled?: boolean;
  }) => void;
  setGuestIdentity: (payload: {
    guestName?: string | null;
    guestEmail?: string | null;
  }) => void;
  setMessages: (messages: ChatMessage[]) => void;
  appendMessage: (message: ChatMessage) => void;
  /** Upsert by id — replaces if present (for streaming / realtime dedupe). */
  upsertMessage: (message: ChatMessage) => void;
  replaceMessageId: (tempId: string, message: ChatMessage) => void;
  removeMessage: (id: string) => void;
  appendStreamingToken: (id: string, token: string) => void;
  finalizeStreamingMessage: (id: string, patch?: Partial<ChatMessage>) => void;
  setAiResponding: (v: boolean) => void;
  setConnectionStatus: (s: ConnectionStatus) => void;
  setError: (e: string | null) => void;
  reset: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  sessionId: null,
  sessionToken: null,
  guestName: null,
  guestEmail: null,
  aiEnabled: true,
  messages: [],
  aiResponding: false,
  connectionStatus: "idle",
  lastError: null,

  setSession: ({ sessionId, sessionToken, guestName, guestEmail, aiEnabled }) =>
    set((state) => ({
      sessionId,
      sessionToken,
      guestName: guestName ?? state.guestName,
      guestEmail: guestEmail ?? state.guestEmail,
      aiEnabled: aiEnabled ?? true,
    })),
  setGuestIdentity: ({ guestName, guestEmail }) =>
    set((state) => ({
      guestName: guestName ?? state.guestName,
      guestEmail: guestEmail ?? state.guestEmail,
    })),
  setMessages: (messages) => set({ messages }),
  appendMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),
  upsertMessage: (message) =>
    set((state) => {
      const idx = state.messages.findIndex((m) => m.id === message.id);
      const optimisticIdx = state.messages.findIndex(
        (m) =>
          m.id.includes("_temp_") &&
          m.role === message.role &&
          m.content === message.content
      );
      if (optimisticIdx !== -1) {
        const next = [...state.messages];
        next[optimisticIdx] = { ...next[optimisticIdx], ...message };
        return { messages: next };
      }
      if (idx === -1) return { messages: [...state.messages, message] };
      const next = [...state.messages];
      next[idx] = { ...next[idx], ...message };
      return { messages: next };
    }),
  replaceMessageId: (tempId, message) =>
    set((state) => {
      const tempIdx = state.messages.findIndex((m) => m.id === tempId);
      const finalIdx = state.messages.findIndex((m) => m.id === message.id);
      if (tempIdx === -1) {
        if (finalIdx !== -1) return {};
        return { messages: [...state.messages, message] };
      }
      const next = [...state.messages];
      if (finalIdx !== -1 && finalIdx !== tempIdx) {
        next.splice(tempIdx, 1);
        return { messages: next };
      }
      next[tempIdx] = { ...next[tempIdx], ...message };
      return { messages: next };
    }),
  removeMessage: (id) =>
    set((state) => ({ messages: state.messages.filter((m) => m.id !== id) })),
  appendStreamingToken: (id, token) =>
    set((state) => {
      const idx = state.messages.findIndex((m) => m.id === id);
      if (idx === -1) {
        return {
          messages: [
            ...state.messages,
            {
              id,
              role: "ai",
              content: token,
              streaming: true,
              createdAt: new Date().toISOString(),
            },
          ],
        };
      }
      const next = [...state.messages];
      next[idx] = { ...next[idx], content: next[idx].content + token };
      return { messages: next };
    }),
  finalizeStreamingMessage: (id, patch = {}) =>
    set((state) => {
      const idx = state.messages.findIndex((m) => m.id === id);
      if (idx === -1) return {}; // Already merged by Realtime — nothing to do
      const newId = (patch.id as string | undefined) ?? id;
      if (newId !== id) {
        const existingFinalIdx = state.messages.findIndex(
          (m, i) => i !== idx && m.id === newId
        );
        if (existingFinalIdx !== -1) {
          // Realtime already delivered the final. Drop the provisional; merge any fields we still own.
          const provisional = state.messages[idx];
          const existing = state.messages[existingFinalIdx];
          const merged = {
            ...existing,
            content: existing.content || provisional.content,
            toolCalls: existing.toolCalls ?? patch.toolCalls ?? provisional.toolCalls,
            streaming: false,
          };
          const next = state.messages.filter((_, i) => i !== idx);
          const adjusted = existingFinalIdx > idx ? existingFinalIdx - 1 : existingFinalIdx;
          next[adjusted] = merged;
          return { messages: next };
        }
      }
      const next = [...state.messages];
      next[idx] = { ...next[idx], ...patch, streaming: false };
      return { messages: next };
    }),
  setAiResponding: (v) => set({ aiResponding: v }),
  setConnectionStatus: (s) => set({ connectionStatus: s }),
  setError: (e) => set({ lastError: e }),
  reset: () =>
    set({
      sessionId: null,
      sessionToken: null,
      guestName: null,
      guestEmail: null,
      aiEnabled: true,
      messages: [],
      aiResponding: false,
      connectionStatus: "idle",
      lastError: null,
    }),
}));
