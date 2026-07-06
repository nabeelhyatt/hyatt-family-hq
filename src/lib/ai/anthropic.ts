import Anthropic from "@anthropic-ai/sdk";

/**
 * Relocated from src/lib/journal/anthropic.ts when the journal module was
 * removed. The client factory itself was never journal-specific — kept here
 * as the shared entry point for any future LLM-parsing feature (class
 * schedules, flight confirmations).
 */

let cached: Anthropic | null = null;

export function anthropic(): Anthropic {
  if (cached) return cached;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not set");
  }
  // Bump retries above the SDK default of 2: the API returns transient 429s and
  // 529s (overloaded) under load, and the SDK retries those with exponential
  // backoff. A few extra attempts ride out a brief overload instead of bubbling
  // a raw error up to the user.
  cached = new Anthropic({ apiKey, maxRetries: 5 });
  return cached;
}
