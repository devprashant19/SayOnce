import "server-only";
import { aiCall } from "./call";
import { VERIFY_SYSTEM, verifyUser } from "./prompts/verify";
import { VerifyAiResult, type Contact, type Draft, type Fact } from "../types";

export interface VerifyDraftInput {
  draft: Draft;
  contact: Contact;
  allowedFacts: Fact[];
  mustKnowHint?: string[];
}

export async function verifyDraftAi(input: VerifyDraftInput) {
  const result = await aiCall({
    step: `verify:${input.contact.id}`,
    system: VERIFY_SYSTEM,
    user: verifyUser({
      draft: input.draft,
      contact: input.contact,
      allowedFacts: input.allowedFacts,
      mustKnowHint: input.mustKnowHint ?? [],
    }),
    schema: VerifyAiResult,
    temperature: 0.1,
  });

  return result;
}

