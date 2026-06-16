import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { chatSessions, chatMessages, guidebooks } from "@/lib/db/schema";
import {
  AI_BASE_URL,
  AI_WIRE_API,
  aiClient,
  AI_FALLBACK_MODEL,
  AI_MODEL,
  aiClientIsConfigured,
} from "@/lib/ai/client";
import { buildGuidebookContext } from "@/lib/ai/context";
import { buildSystemPrompt } from "@/lib/ai/prompts";
import { canAiRespond, incrementUsage } from "@/lib/ai/usage";
import { createAdminClient } from "@/lib/supabase/admin";
import { getLanguageName, readLanguagesSettings } from "@/lib/languages";
import {
  aiReplyMetadata,
  readAiReplyTo,
  readGuestTarget,
} from "@/lib/chat-message-metadata";
import {
  checkRateLimit,
  clientIpIdentifier,
  rateLimitedResponse,
} from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function sseLine(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

function providerErrorMessage(err: unknown): string {
  const error = err as {
    status?: number;
    code?: string;
    message?: string;
    error?: { message?: string; code?: string; status?: string };
  };
  const raw = [
    error.message,
    error.code,
    error.error?.message,
    error.error?.code,
    error.error?.status,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (isQuotaExceededError(err)) {
    return "The AI quota for this project is exhausted. Please use Host for now, or try again after quota resets.";
  }

  if (
    error.status === 429 ||
    raw.includes("rate") ||
    raw.includes("quota") ||
    raw.includes("capacity") ||
    raw.includes("\u8d1f\u8f7d") ||
    raw.includes("get_channel_failed")
  ) {
    return "The AI model is busy right now. Please try again in a moment, or use Host for urgent help.";
  }

  return "The AI concierge could not answer right now. Please try again, or use Host for urgent help.";
}

function isQuotaExceededError(err: unknown): boolean {
  const error = err as {
    status?: number;
    code?: string;
    message?: string;
    error?: { message?: string; code?: string; status?: string };
  };
  const raw = [
    error.message,
    error.code,
    error.error?.message,
    error.error?.code,
    error.error?.status,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return (
    raw.includes("resource_exhausted") ||
    raw.includes("quota exceeded") ||
    raw.includes("current quota") ||
    raw.includes("free_tier") ||
    raw.includes("billing")
  );
}

function isRetryableProviderError(err: unknown): boolean {
  const error = err as {
    status?: number;
    code?: string;
    message?: string;
    error?: { message?: string; code?: string };
  };
  const raw = [
    error.message,
    error.code,
    error.error?.message,
    error.error?.code,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (isQuotaExceededError(err)) return false;

  return (
    error.status === 429 ||
    error.status === 500 ||
    raw.includes("capacity") ||
    raw.includes("\u8d1f\u8f7d") ||
    raw.includes("get_channel_failed")
  );
}

type ChatInput = Array<{ role: "user" | "assistant"; content: string }>;
type WireApi = "chat" | "responses";

function resolveWireApi(model: string): WireApi {
  const configured = AI_WIRE_API.toLowerCase();
  if (configured === "chat" || configured === "responses") {
    return configured;
  }

  const baseUrl = AI_BASE_URL.toLowerCase();
  const normalizedModel = model.toLowerCase();

  if (
    baseUrl.includes("groq.com") ||
    baseUrl.includes("together.xyz") ||
    baseUrl.includes("fireworks.ai") ||
    baseUrl.includes("deepinfra.com") ||
    baseUrl.includes("openrouter.ai") ||
    baseUrl.includes("localhost") ||
    baseUrl.includes("127.0.0.1")
  ) {
    return "chat";
  }

  if (normalizedModel.includes("codex")) {
    return "responses";
  }

  return "chat";
}

async function streamResponsesToClient(
  model: string,
  instructions: string,
  input: ChatInput,
  controller: ReadableStreamDefaultController<Uint8Array>,
  encoder: TextEncoder
) {
  const response = await aiClient.responses.create({
    model,
    stream: true,
    instructions,
    input,
  });

  let text = "";
  let tokensIn = 0;
  let tokensOut = 0;

  for await (const event of response) {
    const type = event.type;

    if (type === "response.output_text.delta") {
      const e = event as { type: string; delta?: string };
      if (e.delta) {
        text += e.delta;
        controller.enqueue(encoder.encode(sseLine("token", { content: e.delta })));
      }
    } else if (type === "response.completed") {
      const e = event as {
        type: string;
        response?: {
          usage?: { input_tokens?: number; output_tokens?: number };
        };
      };
      if (e.response?.usage) {
        tokensIn = e.response.usage.input_tokens ?? tokensIn;
        tokensOut = e.response.usage.output_tokens ?? tokensOut;
      }
    } else if (type === "error") {
      const e = event as { type: string; message?: string };
      console.error("Responses API stream error:", e.message);
    }
  }

  return { text, tokensIn, tokensOut };
}

async function streamChatCompletionsToClient(
  model: string,
  instructions: string,
  input: ChatInput,
  controller: ReadableStreamDefaultController<Uint8Array>,
  encoder: TextEncoder
) {
  let text = "";
  let tokensIn = 0;
  let tokensOut = 0;

  const response = await aiClient.chat.completions.create({
    model,
    stream: true,
    temperature: 0.3,
    messages: [{ role: "system", content: instructions }, ...input],
    stream_options: { include_usage: true },
  });

  for await (const chunk of response) {
    const delta = chunk.choices?.[0]?.delta?.content;
    if (delta) {
      text += delta;
      controller.enqueue(encoder.encode(sseLine("token", { content: delta })));
    }

    if (chunk.usage) {
      tokensIn = chunk.usage.prompt_tokens ?? tokensIn;
      tokensOut = chunk.usage.completion_tokens ?? tokensOut;
    }
  }

  return { text, tokensIn, tokensOut };
}

async function streamModelToClient(
  model: string,
  instructions: string,
  input: ChatInput,
  controller: ReadableStreamDefaultController<Uint8Array>,
  encoder: TextEncoder
) {
  if (resolveWireApi(model) === "responses") {
    return streamResponsesToClient(model, instructions, input, controller, encoder);
  }

  return streamChatCompletionsToClient(
    model,
    instructions,
    input,
    controller,
    encoder
  );
}

/**
 * Returns a human-readable language name (e.g. "Spanish") to inject into the
 * system prompt, or undefined if the guest is on the base language or the
 * requested code isn't one the host enabled.
 */
function resolveResponseLanguage(
  settings: unknown,
  requested: string | null
): string | undefined {
  if (!requested) return undefined;
  const langs = readLanguagesSettings(settings as Record<string, unknown> | null);
  if (!langs.enabled) return undefined;
  if (requested === langs.base_language) return undefined;
  if (!langs.available.includes(requested)) return undefined;
  return getLanguageName(requested);
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ sessionToken: string }> }
) {
  const { sessionToken } = await params;
  const url = new URL(request.url);
  const messageId = url.searchParams.get("messageId");
  const langParam = url.searchParams.get("lang");
  if (!messageId) {
    return new Response("missing messageId", { status: 400 });
  }
  const streamLimit = await checkRateLimit(request, {
    scope: "chat_ai_stream",
    identifier: `${clientIpIdentifier(request)}:${sessionToken}`,
    limit: 20,
    windowMs: 60 * 1000,
  });
  if (!streamLimit.allowed) {
    return rateLimitedResponse(streamLimit);
  }

  const session = await db.query.chatSessions.findFirst({
    where: eq(chatSessions.sessionToken, sessionToken),
  });
  if (!session) return new Response("session not found", { status: 404 });
  if (!session.aiEnabled) return new Response("ai disabled", { status: 403 });

  const guidebook = await db.query.guidebooks.findFirst({
    where: eq(guidebooks.id, session.guidebookId),
  });
  if (!guidebook) return new Response("guidebook not found", { status: 404 });

  if (!aiClientIsConfigured()) {
    return new Response("ai not configured", { status: 500 });
  }

  const history = await db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.sessionId, session.id))
    .orderBy(asc(chatMessages.createdAt));

  const requestedMessage = history.find((message) => message.id === messageId);
  if (
    !requestedMessage ||
    requestedMessage.role !== "guest" ||
    readGuestTarget(requestedMessage.toolCalls) !== "ai"
  ) {
    return new Response("message not found", { status: 404 });
  }

  const existingAiReply = history.find(
    (message) => message.role === "ai" && readAiReplyTo(message.toolCalls) === messageId
  );
  if (existingAiReply) {
    return new Response("ai response already exists", { status: 409 });
  }

  const usage = await canAiRespond(guidebook.userId);
  if (!usage.allowed) {
    return new Response("ai cap reached", { status: 429 });
  }

  const built = await buildGuidebookContext(session.guidebookId);
  if (!built) return new Response("context unavailable", { status: 500 });

  const instructions = buildSystemPrompt(
    built.propertyName,
    built.hostFirstName,
    built.context,
    resolveResponseLanguage(guidebook.settings, langParam)
  );

  // Responses API `input` can be a string or a list of message-shaped items.
  // Map our history to the message list shape. `host` messages are shown as
  // prior assistant turns so the model doesn't repeat what a human said.
  const input: ChatInput = history.map((m) => ({
    role:
      m.role === "guest"
        ? ("user" as const)
        : ("assistant" as const),
    content: m.content,
  }));

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let buffered = "";
      let tokensIn = 0;
      let tokensOut = 0;

      try {
        let result;
        try {
          result = await streamModelToClient(
            AI_MODEL,
            instructions,
            input,
            controller,
            encoder
          );
        } catch (err) {
          if (
            AI_FALLBACK_MODEL &&
            AI_FALLBACK_MODEL !== AI_MODEL &&
            isRetryableProviderError(err)
          ) {
            console.warn(
              `AI model ${AI_MODEL} failed; retrying with fallback ${AI_FALLBACK_MODEL}`,
              err
            );
            result = await streamModelToClient(
              AI_FALLBACK_MODEL,
              instructions,
              input,
              controller,
              encoder
            );
          } else {
            throw err;
          }
        }
        buffered = result.text;
        tokensIn = result.tokensIn;
        tokensOut = result.tokensOut;

        const [saved] = await db
          .insert(chatMessages)
          .values({
            sessionId: session.id,
            role: "ai",
            content: buffered,
            toolCalls: aiReplyMetadata(messageId),
            aiTokensIn: tokensIn || null,
            aiTokensOut: tokensOut || null,
          })
          .returning();

        await incrementUsage(guidebook.userId);
        await db
          .update(chatSessions)
          .set({ lastMessageAt: new Date(), updatedAt: new Date() })
          .where(eq(chatSessions.id, session.id));

        try {
          const admin = createAdminClient();
          await admin.channel(`chat_session:${session.id}`).send({
            type: "broadcast",
            event: "message_insert",
            payload: {
              id: saved.id,
              sessionId: session.id,
              role: "ai",
              content: saved.content,
              toolCalls: saved.toolCalls,
              createdAt: saved.createdAt,
              inReplyToGuestMessageId: messageId,
            },
          });
          await admin.channel(`host_inbox:${guidebook.userId}`).send({
            type: "broadcast",
            event: "session_touch",
            payload: { sessionId: session.id, kind: "ai_message" },
          });
        } catch (err) {
          console.warn("Realtime broadcast failed (ai message)", err);
        }

        controller.enqueue(
          encoder.encode(sseLine("done", { messageId: saved.id }))
        );
      } catch (err) {
        console.error("AI stream failed", err);
        controller.enqueue(
          encoder.encode(sseLine("error", { message: providerErrorMessage(err) }))
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
