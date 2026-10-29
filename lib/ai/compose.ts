import "server-only";
import { z } from "zod";
import { aiCall } from "./call";
import { COMPOSE_SYSTEM, composeUser } from "./prompts/compose";
import { Draft, type Contact, type Fact } from "../types";

/**
 * Compose runs once per selected contact, in parallel.
 *
 * The contact id comes from our own loop, not from the model — a model that
 * mislabels which reader a draft is for would silently send the boss's version
 * to the vendor, so it is never allowed to choose.
 */
const ComposeOutput = Draft.omit({ contactId: true, channel: true });

export interface ComposeOneInput {
  contact: Contact;
  /** Already filtered: routed to this contact and not blocked for them. */
  facts: Fact[];
  project: string;
  learnedRules?: string[];
  previouslyTold?: string[];
}

export async function composeOne(input: ComposeOneInput) {
  const result = await aiCall({
    step: `compose:${input.contact.id}`,
    system: COMPOSE_SYSTEM,
    user: composeUser({
      contact: input.contact,
      facts: input.facts,
      project: input.project,
      learnedRules: input.learnedRules ?? [],
      previouslyTold: input.previouslyTold ?? [],
    }),
    schema: ComposeOutput,
    maxOutputTokens: 4000,
  });

  const draft: Draft = {
    ...result.value,
    contactId: input.contact.id,
    channel: input.contact.channel,
    subject: input.contact.channel === "email" ? result.value.subject : null,
  };

  return { ...result, value: draft };
}

export interface ComposeAllResult {
  drafts: Draft[];
  /** Contacts whose draft failed outright, with the reason to show on the card. */
  failures: Array<{ contactId: string; message: string }>;
  usage: { inputTokens: number; outputTokens: number };
}

export async function composeAll(inputs: ComposeOneInput[]): Promise<ComposeAllResult> {
  // Stagger each compose call slightly to avoid concurrent burst limits on free-tier API quotas
  const settled = await Promise.allSettled(
    inputs.map(async (input, idx) => {
      if (idx > 0) {
        await new Promise((r) => setTimeout(r, idx * 350));
      }
      return composeOne(input);
    }),
  );

  const drafts: Draft[] = [];
  const failures: ComposeAllResult["failures"] = [];
  let inputTokens = 0;
  let outputTokens = 0;

  for (const [index, outcome] of settled.entries()) {
    const contactId = inputs[index]!.contact.id;
    if (outcome.status === "fulfilled") {
      drafts.push(outcome.value.value);
      inputTokens += outcome.value.usage.inputTokens;
      outputTokens += outcome.value.usage.outputTokens;
    } else {
      failures.push({
        contactId,
        message:
          outcome.reason instanceof Error
            ? outcome.reason.message
            : "This draft could not be written. Try Fan out again.",
      });
    }
  }

  return { drafts, failures, usage: { inputTokens, outputTokens } };
}

/** Schema export so the Quality Lab can validate recorded fixtures. */
export const ComposeOutputSchema: z.ZodTypeAny = ComposeOutput;
