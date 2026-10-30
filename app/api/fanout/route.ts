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
import { listContacts } from "@/lib/contact-repo";
import {
  saveFanoutRecord,
  getPastFactsForProject,
  getFrequentContactsForProject,
} from "@/lib/update-repo";
import { REAL_DATASET } from "@/lib/db";
import { datasetFor } from "@/lib/dataset";
import { detectContradictions, type ContradictionAlert } from "@/lib/consistency";
import { composeOne } from "@/lib/ai/compose";
import { isQuotaExhaustedError, INSTANT_MODE_MESSAGE } from "@/lib/ai/call";
import {
  getCachedDemoResult,
  getPreparedFallback,
  type CachedFanoutResult,
} from "@/lib/demo-cache";
import { checkDemoAiAllowance, recordDemoAiUsage } from "@/lib/demo-session";

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
  demoId: z.string().optional(),
  /** The golden set pins this so relative dates grade deterministically. */
  spokenOnIso: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  timeZone: z.string().default("Asia/Kolkata"),
  elapsedSeconds: z.number().int().min(0).optional(),
  /** The Quality Lab sends "lab" so its runs are never filed as real use. */
  source: z.enum(["app", "lab"]).default("app"),
});

export interface FanoutCard {
  messageId: string;
  contact: Contact;
  draft: Draft | null;
  check: CheckOutcome | null;
  /** Why there is no draft, when draft is null. */
  error: string | null;
  toneScore?: number | null;
  verifyIssues?: string[];
  regenerated?: boolean;
  overridden?: boolean;
  sent?: boolean;
  sentAt?: string | null;
}

/**
 * Serve a prepared fan-out: rebuild the hash chain and message ids fresh so
 * the trail is genuinely this run's, persist it like any other update, and
 * return it. Used both when the caller picked a sample and when live AI is
 * unavailable and the app drops into instant mode.
 */
async function servePrepared(
  body: z.infer<typeof RequestBody>,
  cachedDemo: CachedFanoutResult,
  extra: Record<string, unknown> = {},
) {
    const updateId = crypto.randomUUID();
    const at = new Date().toISOString();
    const trailInputs: TrailEntryInput[] = (cachedDemo.trail ?? []).map((t, idx) => ({
      updateId,
      seq: idx + 1,
      at,
      actor: t.actor,
      type: t.type,
      payload: t.payload,
    }));
    const freshTrail = buildChain(trailInputs);
    const freshCards = cachedDemo.cards.map((c) => ({
      ...c,
      messageId: crypto.randomUUID(),
      sent: false,
      sentAt: null,
      overridden: false,
    }));

    try {
      await saveFanoutRecord({
        updateId,
        dataset: datasetFor({ source: body.source, contactSet: body.contactSet }),
        spokenOn: body.spokenOnIso ?? new Date().toISOString().slice(0, 10),
        timeZone: body.timeZone,
        project: body.project || cachedDemo.project || "",
        rawText: cachedDemo.spokenText,
        summary: cachedDemo.summary,
        decisions: cachedDemo.decisions,
        elapsedSeconds: body.elapsedSeconds ?? 1,
        facts: cachedDemo.facts,
        messages: freshCards
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
        trail: freshTrail,
      });
    } catch (err) {
      console.warn("Failed to persist cached demo record:", err);
    }

    return NextResponse.json({
      ...cachedDemo,
      updateId,
      at,
      cards: freshCards,
      trail: freshTrail,
      trailVerdict: verifyChain(freshTrail),
      cached: true,
      // A prepared fan-out has no history behind it, so it cannot honestly
      // claim a contradiction with an earlier update or name someone it left
      // out. Whatever was captured when the sample was generated is not a
      // finding about this run.
      contradictions: [],
      whoDidIForget: [],
      ...extra,
    });
  
}

/**
 * Live AI could not serve this request. Instead of surfacing a failure, switch
 * to instant mode and return a prepared fan-out so the screen fills with real,
 * verified output. The payload states that it is prepared; it never reports a
 * provider state and never carries provider text.
 */
async function instantModeResponse(body: z.infer<typeof RequestBody>) {
  const fallback = getPreparedFallback(body.contactSet);
  if (!fallback) {
    return NextResponse.json({
      mode: "instant",
      cards: [],
      message: INSTANT_MODE_MESSAGE,
    });
  }
  return servePrepared(body, fallback.result, {
    mode: "instant",
    preparedFrom: fallback.id,
    preparedText: fallback.result.spokenText,
    preparedProject: fallback.result.project ?? "",
    message: INSTANT_MODE_MESSAGE,
  });
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

  return withinLiveBudget(request, body);
}

/**
 * Runs the fan-out, but never past the live budget. A slow model, a retry
 * after a 503, or unbounded thinking can each push a live run past the 60s
 * serverless limit, and then the platform kills the function and the visitor
 * gets a raw 504 page — no catch block runs, so instant mode never gets the
 * chance. Racing a deadline guarantees an answer: if the live run has not
 * finished in time, the visitor gets prepared output instead.
 */
async function withinLiveBudget(
  request: Request,
  body: z.infer<typeof RequestBody>,
): Promise<Response> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<"timeout">((resolve) => {
    timer = setTimeout(() => resolve("timeout"), env.liveBudgetMs);
  });
  const live = runFanout(request, body);

  const winner = await Promise.race([live, deadline]);
  clearTimeout(timer);
  if (winner !== "timeout") return winner;

  console.warn(`FANOUT: live run passed ${env.liveBudgetMs}ms; serving instant mode`);
  // The abandoned run may still finish or fail; neither should surface.
  live.catch(() => undefined);
  return instantModeResponse(body);
}

async function runFanout(request: Request, body: z.infer<typeof RequestBody>): Promise<Response> {
  // Phase 6: Instant demo mode cache lookup
  // If text matches a committed sample update, serve pre-verified pipeline results instantly (<50ms)
  const cachedDemo = (body.demoId ? getCachedDemoResult(body.demoId) : null) || getCachedDemoResult(body.spokenText);
  if (cachedDemo) {
    return servePrepared(body, cachedDemo);
  }

  const isDemo = body.contactSet !== "freelance";
  let demoSessionId: string | undefined;

  if (isDemo) {
    const cookieHeader = request.headers.get("cookie") ?? "";
    const match = cookieHeader.match(/sayonce_demo_token=([^;]+)/);
    const sessionToken = request.headers.get("x-demo-session-token") || (match ? match[1] : null);

    const allowance = checkDemoAiAllowance(sessionToken);
    if (!allowance.allowed) {
      return NextResponse.json(
        { error: allowance.message, isCapped: true },
        { status: allowance.status },
      );
    }
    demoSessionId = allowance.sessionId;
  }

  let contacts: Contact[];
  try {
    const dataset = body.contactSet === "freelance" ? REAL_DATASET : body.contactSet;
    const stored = await listContacts(dataset);
    if (stored.length > 0) {
      contacts = stored;
    } else {
      contacts = loadContactSet(body.contactSet);
    }
  } catch {
    try {
      contacts = loadContactSet(body.contactSet);
    } catch {
      return NextResponse.json({ error: `No contact set called "${body.contactSet}".` }, { status: 400 });
    }
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
    // Any failure of a live AI step drops into instant mode rather than
    // showing a dead end: a wrong key, a withdrawn model, a network blip and a
    // provider limit all look the same to the person using this. The cause is
    // logged above for us; what they see is prepared output that works.
    return instantModeResponse(body);
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
    if (isQuotaExhaustedError(error)) {
      return instantModeResponse(body);
    }
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
  let composed: Awaited<ReturnType<typeof composeAll>>;
  try {
    composed = await composeAll(includedAssignments);
  } catch (error) {
    console.error("COMPOSE ERROR:", error);
    // Any failure of a live AI step drops into instant mode rather than
    // showing a dead end: a wrong key, a withdrawn model, a network blip and a
    // provider limit all look the same to the person using this. The cause is
    // logged above for us; what they see is prepared output that works.
    return instantModeResponse(body);
  }
  if (isDemo && demoSessionId) {
    recordDemoAiUsage(demoSessionId);
  }
  note({
    actor: "ai",
    type: "composed",
    payload: {
      drafts: composed.drafts.map((d) => ({ contactId: d.contactId, usedFactIds: d.usedFactIds })),
      failures: composed.failures,
    },
  });

  const cards: FanoutCard[] = await Promise.all(
    assignments.map(async (assignment) => {
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

      let currentDraft = draft;
      let check = checkDraft({
        draft: currentDraft,
        contact: assignment.contact,
        allowedFacts: assignment.facts,
        allFacts: facts,
      });

      let regenerated = false;
      // Regeneration loop: run ONCE if deterministic check failed
      if (!check.ok) {
        try {
          const feedback = check.failures.map((f) => f.message);
          const regen = await composeOne({
            contact: assignment.contact,
            facts: assignment.facts,
            project: body.project,
            learnedRules: [
              `CORRECTION FOR PREVIOUS DRAFT: The draft was rejected with these errors: ${feedback.join("; ")}. You MUST fix them.`,
            ],
          });
          const reCheck = checkDraft({
            draft: regen.value,
            contact: assignment.contact,
            allowedFacts: assignment.facts,
            allFacts: facts,
          });
          currentDraft = regen.value;
          check = reCheck;
          regenerated = true;
        } catch {
          // If regen fails, keep original draft and failures
        }
      }

      return {
        messageId,
        contact: assignment.contact,
        draft: currentDraft,
        check,
        error: null,
        regenerated,
        overridden: false,
        sent: false,
        sentAt: null,
      };
    }),
  );

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

  // Consistency Guard: Compare against past facts for this project in last 30 days
  const contradictions: ContradictionAlert[] = [];
  if (body.project) {
    try {
      const pastFacts = await getPastFactsForProject(body.project, 30);
      for (const card of cards) {
        if (!card.draft) continue;
        const found = detectContradictions({
          currentFacts: facts,
          pastFacts,
          recipientId: card.contact.id,
          recipientName: card.contact.name,
          project: body.project,
        });
        contradictions.push(...found);
      }
    } catch (err) {
      console.warn("Consistency check skipped:", err);
    }
  }

  // "Who did I forget?": Check if a frequent contact for this project was omitted
  let whoDidIForget: Array<{ contactId: string; name: string; timesSeen: number; totalRecent: number }> = [];
  if (body.project) {
    try {
      const frequent = await getFrequentContactsForProject(body.project, 5);
      const chosenIds = new Set(
        cards.filter((c) => c.draft !== null).map((c) => c.contact.id),
      );
      const contactMap = new Map(contacts.map((c) => [c.id, c.name]));
      whoDidIForget = frequent
        .filter((f) => !chosenIds.has(f.contactId))
        .map((f) => ({
          ...f,
          name: contactMap.get(f.contactId) ?? f.contactId,
        }));
    } catch (err) {
      console.warn("Frequent contacts check skipped:", err);
    }
  }

  // Persist update, facts, messages and trail
  try {
    await saveFanoutRecord({
      updateId,
      dataset: datasetFor({
        source: body.source,
        contactSet: body.contactSet,
        demoSessionId: isDemo ? demoSessionId : undefined,
      }),
      spokenOn: body.spokenOnIso ?? new Date().toISOString().slice(0, 10),
      timeZone: body.timeZone,
      project: body.project,
      rawText: scrubbed.text,
      summary,
      decisions,
      elapsedSeconds: body.elapsedSeconds ?? null,
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
    contradictions,
    whoDidIForget,
    voiceReturn: voiceReturn({
      spokenText: scrubbed.text,
      drafts: composed.drafts,
      languagesByContactId: Object.fromEntries(contacts.map((c) => [c.id, c.language])),
      baselineMinutesPerUpdate: env.baselineMinutes,
      actualSeconds: body.elapsedSeconds ?? null,
    }),
    trail,
    trailVerdict: verifyChain(trail),
  });
}
