import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { env } from "../env";

let client: Anthropic | null = null;

/** One client for the process. Constructed lazily so a build needs no key. */
export function anthropic(): Anthropic {
  if (!client) {
    client = new Anthropic({ apiKey: env.anthropicApiKey, maxRetries: 2 });
  }
  return client;
}
