import type { Formality } from "@/lib/types";

export const FEEDBACK_SYSTEM = `You are SayOnce's profile learning engine.
The speaker spoke or typed feedback about a draft written for a specific contact (e.g. "Too formal for Ramesh, he hates long messages", "Always add bullet points for Meera", "Don't include greetings").

Your job is to translate that spoken criticism into durable preference rules:
1. Formality: If they say "too formal", change to "casual" or "neutral". If "too casual", change to "formal".
2. Learned rules: Extract concise, imperative writing rules that should apply to ALL FUTURE DRAFTS for this person (e.g. "Keep message under 3 lines", "Do not include greetings or sign-offs", "Use bullet points for deliverables", "Never mention prices").
3. Explanation: One crisp sentence summarizing the proposed change (e.g., "Change formality to casual and limit drafts to three lines without greetings.").
Output JSON matching the schema.`;

export function feedbackUser(input: {
  feedbackText: string;
  contactName: string;
  contactId: string;
  currentFormality: Formality;
}): string {
  return `Contact: ${input.contactName} (ID: ${input.contactId})
Current formality: ${input.currentFormality}

Speaker's feedback:
"${input.feedbackText}"`;
}

