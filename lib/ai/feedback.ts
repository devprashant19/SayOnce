import { z } from "zod";
import { aiCall } from "./call";
import { FEEDBACK_SYSTEM, feedbackUser } from "./prompts/feedback";
import type { Formality } from "@/lib/types";

export const FeedbackProposal = z.object({
  contactId: z.string(),
  formality: z.enum(["formal", "neutral", "casual"]).optional(),
  learnedRules: z
    .array(z.string())
    .describe(
      "Actionable style instructions to remember for future drafts, e.g. 'keep to three lines', 'no greetings', 'never mention prices'",
    ),
  explanation: z
    .string()
    .describe("Clear sentence describing the proposed change to the contact's preferences"),
});

export type FeedbackProposal = z.infer<typeof FeedbackProposal>;

export async function parseFeedback(input: {
  feedbackText: string;
  contactId: string;
  contactName: string;
  currentFormality: Formality;
}): Promise<FeedbackProposal> {
  const result = await aiCall({
    step: `feedback-${input.contactId}`,
    system: FEEDBACK_SYSTEM,
    user: feedbackUser(input),
    schema: FeedbackProposal,
  });

  return result.value;
}
