import { NextResponse } from "next/server";
import { z } from "zod";
import { extract } from "@/lib/ai/extract";
import { route } from "@/lib/ai/route";
import { composeAll } from "@/lib/ai/compose";
import { checkDraft, type CheckOutcome } from "@/lib/checker";
import { scrub } from "@/lib/scrub";
import { buildChain, verifyChain, type TrailEntryInput } from "@/lib/trail";
import { voiceReturn } from "@/lib/voice-return";
import { Contact, type Draft, type Fact } from "@/lib/types";
import { env } from "@/lib/env";
import { loadContactSet } from "@/lib/contact-sets";
import { saveFanoutRecord } from "@/lib/update-repo";

/**
 * Fan out: one spoken update -> one checked draft per person.
 *
 * Phase 1 wires Extract -> Compose -> deterministic check, with every contact
 * receiving every non-blocked fact. Phase 2 inserts the Route step between
 * Extract and Compose; Phase 4 adds the AI Verify layer after the check. The
 * Trust Trail is written from the first version so no step is ever retrofitted
 * into the audit log.
 */

export const runtime = "nodejs";
// Compose fans out in parallel, but a five-contact update on a cold start can
// still take a while. Keep it inside the serverless budget deliberately.
export const maxDuration = 60;

const RequestBody = z.object({
  spokenText: z.string().min(1).max(8000),
  project: z.string().max(120).default(""),
  contactSet: z.string().default("india"),
  /** The golden set pins this so relative dates grade deterministically. */
  spokenOnIso: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  timeZone: z.string().default("Asia/Kolkata"),
});

export interface FanoutCard {
  messageId: string;
  contact: Contact;
  draft: Draft | null;
  check: CheckOutcome | null;
  /** Why there is no draft, when draft is null. */
  error: string | null;
  sent?: boolean;
  sentAt?: string | null;
}

export async function POST(request: Request) {
  let body: z.infer<typeof RequestBody>;
  try {
    body = RequestBody.parse(await request.json());
  } catch {
    return NextResponse.json(
      { error: "Send a spoken update of at least one character." },
      { status: 400 },
    );
  }

  let contacts: Contact[];
  try {
    contacts = loadContactSet(body.contactSet);
  } catch {
    return NextResponse.json({ error: `No contact set called "${body.contactSet}".` }, { status: 400 });
  }

  const updateId = crypto.randomUUID();
  const at = new Date().toISOString();
  const trailInputs: TrailEntryInput[] = [];
  let seq = 0;
  const note = (entry: Omit<TrailEntryInput, "updateId" | "seq" | "at">) => {
    seq += 1;
    trailInputs.push({ ...entry, updateId, seq, at: new Date().toISOString() });
  };

  // The spoken text is scrubbed before it is stored or shown anywhere.
  const scrubbed = scrub(body.spokenText);
  note({ actor: "user", type: "spoken", payload: { text: scrubbed.text, project: body.project } });
  if (scrubbed.masked.length > 0) {
    note({ actor: "system", type: "scrubbed", payload: { masked: scrubbed.masked } });
  }

  let facts: Fact[];
  let summary: string;
  let decisions: string[];
  try {
    const extracted = await extract({
      spokenText: scrubbed.text,
      contacts,
      ...(body.spokenOnIso ? { spokenOnIso: body.spokenOnIso } : {}),
      timeZone: body.timeZone,
    });
    facts = extracted.value.facts;
    summary = extracted.value.summary;
    decisions = extracted.value.decisions;
    note({
      actor: "ai",
      type: "extracted",
      payload: {
        factIds: facts.map((f) => f.id),
        correctionsApplied: extracted.value.correctionsApplied,
      },
    });
  } catch (error) {
    console.error("FANOUT ERROR:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not read that update. Try saying it again.",
      },
      { status: 502 },
    );
  }

  if (facts.length === 0) {
    return NextResponse.json(
      { error: "No facts found in that update. Say what changed, for whom, and by when." },
      { status: 422 },
    );
  }

  // --- Phase 2: Route step ------------------------------------------------
  // Decides who needs to know and which facts each person receives.
  // Privacy Shield post-filter strictly enforces blocked facts and standing instructions.
  let routeOutput: Awaited<ReturnType<typeof route>>;
  try {
    routeOutput = await route({
      facts,
      contacts,
      project: body.project,
    });
  } catch (error) {
    console.error("ROUTE ERROR:", error);
    routeOutput = {
      value: {
        concernsNobody: false,
        decisions: contacts.map((c) => ({
          contactId: c.id,
          include: true,
          reason: "Fallback routing",
          confidence: 0.8,
          factIds: facts.filter((f) => !f.privacy.blockedFor.includes(c.id)).map((f) => f.id),
        })),
      },
      usage: { inputTokens: 0, outputTokens: 0 },
      retried: false,
    };
  }

  const assignments = contacts.map((contact) => {
    const decision = routeOutput.value.decisions.find((d) => d.contactId === contact.id);
    const isIncluded =
      !routeOutput.value.concernsNobody &&
      (decision?.include ?? false) &&
      (decision?.confidence ?? 0) >= 0.5;

    // Allowed facts: only facts routed to this contact, minus any privacy.blockedFor facts
    const rawFactIds = decision?.factIds ?? [];
    const allowedFacts = facts.filter((f) => {
      if (!rawFactIds.includes(f.id)) return false;
      if (f.privacy.blockedFor.includes(contact.id)) return false;
      return true;
    });

    return {
      contact,
      decision,
      isIncluded: isIncluded && allowedFacts.length > 0,
      facts: allowedFacts,
      project: body.project,
    };
  });

  note({
    actor: "ai",
    type: "routed",
    payload: {
      strategy: "ai-route",
      concernsNobody: routeOutput.value.concernsNobody,
      perContact: assignments.map((a) => ({
        contactId: a.contact.id,
        include: a.isIncluded,
        reason: a.decision?.reason ?? "Not affected.",
        confidence: a.decision?.confidence ?? 0,
        factIds: a.facts.map((f) => f.id),
        withheld: facts
          .filter((f) => f.privacy.blockedFor.includes(a.contact.id))
          .map((f) => f.id),
      })),
    },
  });

  const includedAssignments = assignments.filter((a) => a.isIncluded);
  const composed = await composeAll(includedAssignments);
  note({
    actor: "ai",
    type: "composed",
    payload: {
      drafts: composed.drafts.map((d) => ({ contactId: d.contactId, usedFactIds: d.usedFactIds })),
      failures: composed.failures,
    },
  });

  const cards: FanoutCard[] = assignments.map((assignment) => {
    const messageId = crypto.randomUUID();
    if (!assignment.isIncluded) {
      return {
        messageId,
        contact: assignment.contact,
        draft: null,
        check: null,
        error: null,
        sent: false,
        sentAt: null,
      };
    }
    const draft = composed.drafts.find((d) => d.contactId === assignment.contact.id) ?? null;
    if (!draft) {
      const failure = composed.failures.find((f) => f.contactId === assignment.contact.id);
      return {
        messageId,
        contact: assignment.contact,
        draft: null,
        check: null,
        error: failure?.message ?? "No draft was produced.",
        sent: false,
        sentAt: null,
      };
    }
    const check = checkDraft({
      draft,
      contact: assignment.contact,
      allowedFacts: assignment.facts,
      allFacts: facts,
    });
    return {
      messageId,
      contact: assignment.contact,
      draft,
      check,
      error: null,
      sent: false,
      sentAt: null,
    };
  });

  note({
    actor: "system",
    type: "verified",
    payload: {
      results: cards.map((card) => ({
        contactId: card.contact.id,
        ok: card.check?.ok ?? false,
        failures: card.check?.failures.map((f) => f.code) ?? ["no-draft"],
      })),
    },
  });

  const trail = buildChain(trailInputs);

  // Persist update, facts, messages and trail
  try {
    await saveFanoutRecord({
      updateId,
      dataset: body.contactSet === "freelance" ? "real" : body.contactSet,
      spokenOn: body.spokenOnIso ?? new Date().toISOString().slice(0, 10),
      timeZone: body.timeZone,
      project: body.project,
      rawText: scrubbed.text,
      summary,
      decisions,
      facts,
      messages: cards
        .filter((c) => c.draft !== null)
        .map((c) => ({
          id: c.messageId,
          contactId: c.contact.id,
          channel: c.draft!.channel,
          subject: c.draft!.subject,
          body: c.draft!.body,
          usedFactIds: c.draft!.usedFactIds,
          sentences: c.draft!.sentences,
          checkOk: c.check?.ok ?? null,
          checkFailures: c.check?.failures ?? [],
        })),
      trail,
    });
  } catch (err) {
    console.warn("Failed to persist fanout record:", err);
  }

  return NextResponse.json({
    updateId,
    at,
    spokenText: scrubbed.text,
    masked: scrubbed.masked,
    summary,
    decisions,
    facts,
    cards,
    routing: routeOutput.value,
    voiceReturn: voiceReturn({
      spokenText: scrubbed.text,
      drafts: composed.drafts,
      languagesByContactId: Object.fromEntries(contacts.map((c) => [c.id, c.language])),
      baselineMinutesPerUpdate: env.baselineMinutes,
      actualSeconds: null,
    }),
    trail,
    trailVerdict: verifyChain(trail),
  });
}
