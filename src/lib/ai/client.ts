import OpenAI from "openai";

/**
 * Provider-agnostic OpenAI-compatible client. Most providers only need:
 * AI_BASE_URL, AI_API_KEY, AI_MODEL.
 */
export const AI_BASE_URL = process.env.AI_BASE_URL || "https://api.openai.com/v1";
export const AI_API_KEY = process.env.AI_API_KEY ?? "";

export const aiClient = new OpenAI({
  apiKey: AI_API_KEY,
  baseURL: AI_BASE_URL,
});

export const AI_MODEL = process.env.AI_MODEL || "gpt-4o-mini";
export const AI_FALLBACK_MODEL = process.env.AI_FALLBACK_MODEL || "";

/**
 * Optional escape hatch. Leave as "auto" for endpoint/model inference.
 * Supported values: auto, chat, responses.
 */
export const AI_WIRE_API = process.env.AI_WIRE_API || "auto";

export function aiClientIsConfigured(): boolean {
  return Boolean(AI_API_KEY);
}
