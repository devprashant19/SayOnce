import { z } from "zod";

/**
 * Every AI step in SayOnce returns JSON validated against a schema in this
 * file. Nothing downstream ever reads a raw model string.
 */

// ---------------------------------------------------------------------------
// Contacts
// ---------------------------------------------------------------------------

export const Channel = z.enum(["whatsapp", "email"]);
export type Channel = z.infer<typeof Channel>;

export const Formality = z.enum(["casual", "neutral", "formal"]);
export type Formality = z.infer<typeof Formality>;

export const Contact = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  role: z.string().min(1),
  /** How this person relates to the speaker: "my boss", "our packaging vendor". */
  relationship: z.string().default(""),
  /**
   * Free text on purpose. "Hindi, Devanagari", "Brazilian Portuguese, informal",
   * "Hinglish, Roman script". Never an enum — that is what makes SayOnce
   * region-neutral.
   */
  language: z.string().min(1),
  channel: Channel,
  /** E.164, leading +. Required when channel is whatsapp. */
  phone: z.string().regex(/^\+[1-9]\d{6,14}$/).nullable().default(null),
  email: z.string().email().nullable().default(null),
  formality: Formality,
  /** What this person actually needs from an update. Drives fact filtering. */
  caresAbout: z.string().default(""),
  /** Standing topics this person must never be told about. */
  neverTell: z.array(z.string()).default([]),
  /** Learned preferences from voice feedback. Phase 5. */
  learnedRules: z.array(z.string()).optional(),
  profileVersion: z.number().int().optional(),
});
export type Contact = z.infer<typeof Contact>;

// ---------------------------------------------------------------------------
// Extract
// ---------------------------------------------------------------------------

export const FactType = z.enum([
  "date",
  "quantity",
  "person",
  "place",
  "status",
  "decision",
  "ask",
  "commitment",
]);
export type FactType = z.infer<typeof FactType>;

export const Fact = z.object({
  id: z.string().min(1),
  /** The fact as a short self-contained sentence, in the language it was said. */
  text: z.string().min(1),
  type: FactType,
  values: z.object({
    numbers: z.array(z.string()).default([]),
    /** ISO-8601 dates only. Relative speech is resolved before it lands here. */
    datesIso: z.array(z.string()).default([]),
    names: z.array(z.string()).default([]),
  }),
  /** Character offsets into the raw spoken text. Drives fact provenance. */
  sourceSpan: z.object({ start: z.number().int().min(0), end: z.number().int().min(0) }),
  privacy: z.object({
    /** Contact ids this fact must never reach. */
    blockedFor: z.array(z.string()).default([]),
    /** Why it is locked, in the speaker's words. Shown in the Privacy panel. */
    reason: z.string().default(""),
  }),
});
export type Fact = z.infer<typeof Fact>;

export const ExtractResult = z.object({
  facts: z.array(Fact),
  /** Mid-sentence corrections the speaker made: "Tuesday, no wait, Wednesday". */
  correctionsApplied: z.array(
    z.object({ from: z.string(), to: z.string(), note: z.string().default("") }),
  ).default([]),
  /** One line the speaker would recognise as a summary of their own update. */
  summary: z.string().default(""),
  decisions: z.array(z.string()).default([]),
});
export type ExtractResult = z.infer<typeof ExtractResult>;

// ---------------------------------------------------------------------------
// Route
// ---------------------------------------------------------------------------

export const RouteDecision = z.object({
  contactId: z.string().min(1),
  include: z.boolean(),
  /** One line a human can check in two seconds. */
  reason: z.string().min(1),
  confidence: z.number().min(0).max(1),
  /** Facts this contact should receive. Never contains a fact blocked for them. */
  factIds: z.array(z.string()).default([]),
});
export type RouteDecision = z.infer<typeof RouteDecision>;

export const RouteResult = z.object({
  decisions: z.array(RouteDecision),
  /** Set when the update genuinely concerns nobody. Never force a recipient. */
  concernsNobody: z.boolean().default(false),
});
export type RouteResult = z.infer<typeof RouteResult>;

// ---------------------------------------------------------------------------
// Compose
// ---------------------------------------------------------------------------

export const Draft = z.object({
  contactId: z.string().min(1),
  channel: Channel,
  /** Required for email, null for whatsapp. */
  subject: z.string().nullable().default(null),
  body: z.string().min(1),
  /** Facts this draft actually used. The checker verifies the claim. */
  usedFactIds: z.array(z.string()).default([]),
  /** Sentence-level provenance. Powers the hover highlight. */
  sentences: z.array(
    z.object({ sentence: z.string(), factIds: z.array(z.string()).default([]) }),
  ).default([]),
});
export type Draft = z.infer<typeof Draft>;

// ---------------------------------------------------------------------------
// Verify (AI layer; the deterministic layer lives in lib/checker.ts)
// ---------------------------------------------------------------------------

export const VerifyAiResult = z.object({
  contactId: z.string().min(1),
  missingMustKnow: z.array(z.string()).default([]),
  addedClaims: z.array(z.string()).default([]),
  toneScore: z.number().min(1).max(5),
  issues: z.array(z.string()).default([]),
});
export type VerifyAiResult = z.infer<typeof VerifyAiResult>;

// ---------------------------------------------------------------------------
// Voice contact entry (Phase 2)
// ---------------------------------------------------------------------------

export const ParsedContact = z.object({
  name: z.string().nullable(),
  role: z.string().nullable(),
  relationship: z.string().nullable(),
  language: z.string().nullable(),
  channel: Channel.nullable(),
  phone: z.string().nullable(),
  email: z.string().nullable(),
  formality: Formality.nullable(),
  caresAbout: z.string().nullable(),
  neverTell: z.array(z.string()).default([]),
  /** Fields the speaker did not supply. These are highlighted, never guessed. */
  unclearFields: z.array(z.string()).default([]),
});
export type ParsedContact = z.infer<typeof ParsedContact>;

// ---------------------------------------------------------------------------
// Golden set (Phase 0) — the contract the Quality Lab grades against
// ---------------------------------------------------------------------------

export const GoldenGroup = z.enum([
  "real",
  "hinglish-edge",
  "tricky-instruction",
  "global",
  "adversarial",
]);
export type GoldenGroup = z.infer<typeof GoldenGroup>;

export const GoldenCase = z.object({
  id: z.string().min(1),
  group: GoldenGroup,
  spokenText: z.string().min(1),
  /** The day the update was spoken, so relative dates grade deterministically. */
  spokenOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  contactSet: z.string().min(1),
  expectedRecipients: z.array(z.string()),
  /** contactId -> facts that must appear in that person's draft. */
  mustKnow: z.record(z.string(), z.array(z.string())).default({}),
  /** contactId -> facts that must never appear in that person's draft. */
  blocked: z.record(z.string(), z.array(z.string())).default({}),
  /** contactId -> expected language/script label. */
  expectedLanguage: z.record(z.string(), z.string()).default({}),
  notes: z.string().default(""),
});
export type GoldenCase = z.infer<typeof GoldenCase>;

// ---------------------------------------------------------------------------
// Trust Trail
// ---------------------------------------------------------------------------

export const TrailEntryType = z.enum([
  "spoken",
  "extracted",
  "routed",
  "composed",
  "verified",
  "scrubbed",
  "edited",
  "override",
  "sent",
  "exported",
  "profile-change",
  "consistency-choice",
  "command",
]);
export type TrailEntryType = z.infer<typeof TrailEntryType>;
