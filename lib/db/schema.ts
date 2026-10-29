import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/**
 * SayOnce schema.
 *
 * Two rules shape every table here:
 *
 * 1. Demo data and real data never mix. Every row carries a `dataset`
 *    ('real' or a signed demo session id), and demo mode queries can only ever
 *    see demo rows. That separation is what makes a public, no-login app safe.
 *
 * 2. trail_entries is append-only. No update, no delete, ever. A correction is
 *    a new row. The hash chain is only worth something if that holds.
 */

export const contacts = pgTable(
  "contacts",
  {
    id: text("id").primaryKey(),
    dataset: text("dataset").notNull(),
    name: text("name").notNull(),
    role: text("role").notNull(),
    relationship: text("relationship").notNull().default(""),
    /** Free text on purpose — see lib/types.ts. */
    language: text("language").notNull(),
    channel: text("channel").notNull(),
    phone: text("phone"),
    email: text("email"),
    formality: text("formality").notNull(),
    caresAbout: text("cares_about").notNull().default(""),
    neverTell: jsonb("never_tell").$type<string[]>().notNull().default([]),
    /** Accepted voice-feedback rules, newest last. Phase 5. */
    learnedRules: jsonb("learned_rules").$type<string[]>().notNull().default([]),
    /** Bumped on every accepted profile change, so drafts cite a version. */
    profileVersion: integer("profile_version").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
  },
  (table) => [index("contacts_dataset_idx").on(table.dataset)],
);

export const updates = pgTable(
  "updates",
  {
    id: text("id").primaryKey(),
    dataset: text("dataset").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    /** The day the update was spoken, for deterministic relative dates. */
    spokenOn: text("spoken_on").notNull(),
    timeZone: text("time_zone").notNull().default("Asia/Kolkata"),
    project: text("project").notNull().default(""),
    /** Already scrubbed. The raw string is never stored. */
    rawText: text("raw_text").notNull(),
    summary: text("summary").notNull().default(""),
    decisions: jsonb("decisions").$type<string[]>().notNull().default([]),
    /** Seconds from opening Speak to the last send. Feeds Voice Return. */
    elapsedSeconds: integer("elapsed_seconds"),
  },
  (table) => [index("updates_dataset_created_idx").on(table.dataset, table.createdAt)],
);

export const facts = pgTable(
  "facts",
  {
    id: text("id").primaryKey(),
    updateId: text("update_id").notNull(),
    text: text("text").notNull(),
    type: text("type").notNull(),
    values: jsonb("values")
      .$type<{ numbers: string[]; datesIso: string[]; names: string[] }>()
      .notNull(),
    sourceSpanStart: integer("source_span_start").notNull(),
    sourceSpanEnd: integer("source_span_end").notNull(),
    blockedFor: jsonb("blocked_for").$type<string[]>().notNull().default([]),
    blockedReason: text("blocked_reason").notNull().default(""),
    /** Set for commitment facts. Phase 5. */
    commitmentOwner: text("commitment_owner"),
    commitmentDue: text("commitment_due"),
    commitmentStatus: text("commitment_status"),
  },
  (table) => [index("facts_update_idx").on(table.updateId)],
);

export const messages = pgTable(
  "messages",
  {
    id: text("id").primaryKey(),
    updateId: text("update_id").notNull(),
    contactId: text("contact_id").notNull(),
    channel: text("channel").notNull(),
    subject: text("subject"),
    body: text("body").notNull(),
    usedFactIds: jsonb("used_fact_ids").$type<string[]>().notNull().default([]),
    sentences: jsonb("sentences")
      .$type<Array<{ sentence: string; factIds: string[] }>>()
      .notNull()
      .default([]),
    /** Deterministic checker result. Null means not yet checked. */
    checkOk: boolean("check_ok"),
    checkFailures: jsonb("check_failures").$type<unknown[]>().notNull().default([]),
    /** AI verify layer. */
    toneScore: real("tone_score"),
    verifyIssues: jsonb("verify_issues").$type<string[]>().notNull().default([]),
    /** True when the speaker sent it despite a failed check. Logged in the trail. */
    overridden: boolean("overridden").notNull().default(false),
    sent: boolean("sent").notNull().default(false),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    editedByUser: boolean("edited_by_user").notNull().default(false),
  },
  (table) => [
    index("messages_update_idx").on(table.updateId),
    index("messages_contact_idx").on(table.contactId),
  ],
);

/**
 * Append-only. Enforce it in the database too — a revoked UPDATE/DELETE grant
 * on this table is the difference between a promise and a guarantee. See
 * drizzle/0001_trail_append_only.sql.
 */
export const trailEntries = pgTable(
  "trail_entries",
  {
    id: text("id").primaryKey(),
    updateId: text("update_id").notNull(),
    seq: integer("seq").notNull(),
    at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
    actor: text("actor").notNull(),
    type: text("type").notNull(),
    payloadJson: jsonb("payload_json").$type<unknown>().notNull(),
    prevHash: text("prev_hash").notNull(),
    hash: text("hash").notNull(),
  },
  (table) => [uniqueIndex("trail_update_seq_idx").on(table.updateId, table.seq)],
);

/** Quality Lab run history, so improvement is visible rather than claimed. */
export const labRuns = pgTable("lab_runs", {
  id: text("id").primaryKey(),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  model: text("model").notNull(),
  graderEffort: text("grader_effort").notNull(),
  caseCount: integer("case_count").notNull(),
  scores: jsonb("scores").$type<Record<string, number>>().notNull(),
  perCase: jsonb("per_case").$type<unknown[]>().notNull().default([]),
  passed: boolean("passed").notNull(),
});

/** Per-visitor and per-day live-AI accounting for the judge demo. */
export const demoUsage = pgTable(
  "demo_usage",
  {
    id: text("id").primaryKey(),
    sessionId: text("session_id").notNull(),
    day: text("day").notNull(),
    calls: integer("calls").notNull().default(0),
    lastAt: timestamp("last_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("demo_usage_session_day_idx").on(table.sessionId, table.day)],
);
