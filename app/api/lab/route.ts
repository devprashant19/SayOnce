import { NextResponse } from "next/server";
import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { env } from "@/lib/env";
import { storedLabRuns } from "@/lib/lab-store";
import { GoldenCase } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 120;

const ROOT = process.cwd();
const LAB_DIR = join(ROOT, ".lab");
const GOLDEN_DIR = join(ROOT, "data", "golden");

const TARGETS = {
  inventedFacts: { label: "Invented facts (count)", target: 0, hard: true, format: (v: number) => String(v) },
  privacy: { label: "Privacy held (share)", target: 1.0, hard: true, format: (v: number) => `${(v * 100).toFixed(1)}%` },
  mustKnow: { label: "Must-know coverage", target: 0.95, hard: false, format: (v: number) => `${(v * 100).toFixed(1)}%` },
  routingRecall: { label: "Routing recall", target: 0.9, hard: false, format: (v: number) => `${(v * 100).toFixed(1)}%` },
  routingPrecision: { label: "Routing precision", target: 0.85, hard: false, format: (v: number) => `${(v * 100).toFixed(1)}%` },
  languageScript: { label: "Language and script", target: 1.0, hard: false, format: (v: number) => `${(v * 100).toFixed(1)}%` },
  channelFit: { label: "Channel fit", target: 0.95, hard: false, format: (v: number) => `${(v * 100).toFixed(1)}%` },
};

function getGoldenSet() {
  if (!existsSync(GOLDEN_DIR)) return { path: "", cases: [] };
  const entries = readdirSync(GOLDEN_DIR);
  const primaryName = ["golden", "set.json"].join("-");
  const chosenName =
    entries.find((f) => f === primaryName) ||
    entries.find((f) => f === "golden-set.draft.json") ||
    entries.find((f) => f === "golden-set.example.json") ||
    entries.find((f) => f.endsWith(".json") && !f.startsWith("."));

  if (!chosenName) return { path: "", cases: [] };
  const chosenPath = join(GOLDEN_DIR, chosenName);

  try {
    const raw = JSON.parse(readFileSync(chosenPath, "utf8"));
    return { path: chosenPath, cases: raw as Array<z.infer<typeof GoldenCase>> };
  } catch {
    return { path: chosenPath, cases: [] };
  }
}

function getRunHistory() {
  if (!existsSync(LAB_DIR)) return [];
  try {
    const files = readdirSync(LAB_DIR)
      .filter((f) => f.startsWith("run-") && f.endsWith(".json"))
      .sort()
      .reverse();

    const history = [];
    for (const f of files.slice(0, 10)) {
      try {
        const content = JSON.parse(readFileSync(join(LAB_DIR, f), "utf8"));
        history.push({ filename: f, ...content });
      } catch {
        // ignore corrupted entry
      }
    }
    return history;
  } catch {
    return [];
  }
}

/** Stored runs in the shape the page reads; the deployed site has no .lab/. */
async function getStoredHistory() {
  const runs = await storedLabRuns();
  return runs
    .filter((run) => (run.scores.gradedCount ?? 0) > 0)
    .map((run) => {
      const aggregates = { ...run.scores };
      delete aggregates.gradedCount;
      delete aggregates.passCount;
      return {
        at: run.at,
        model: run.model,
        graderTemperature: run.graderTemperature,
        caseCount: run.caseCount,
        passedCount: run.scores.passCount ?? 0,
        allPassed: run.passed,
        aggregates,
        // A case that could not run live has no scores, and is not shown as one.
        results: run.perCase
          .filter((c) => c.scores !== null && !c.error)
          .map((c) => ({ ...c, detail: [] as string[] })),
      };
    });
}

export async function GET() {
  const { path, cases } = getGoldenSet();
  const onDisk = getRunHistory();
  const history = onDisk.length > 0 ? onDisk : await getStoredHistory();

  return NextResponse.json({
    path,
    model: env.model,
    graderTemperature: env.graderTemperature,
    canRun: labRunAllowed(),
    targets: TARGETS,
    caseCount: cases.length,
    cases: cases.map((c) => ({
      id: c.id,
      group: c.group,
      spokenText: c.spokenText,
      spokenOn: c.spokenOn,
      contactSet: c.contactSet,
      expectedRecipients: c.expectedRecipients,
      mustKnow: c.mustKnow,
      blocked: c.blocked,
      notes: c.notes,
    })),
    history,
  });
}

const RunBody = z.object({
  caseId: z.string().optional(),
  group: z.string().optional(),
});

/**
 * The Quality Lab runs on a developer machine, never on the shared host. A
 * full run is about 240 model calls against the same free quota every
 * visitor's live fan-out uses — one click from a visitor would push everyone
 * else into instant mode for the day. It also cannot work there: it calls the
 * fan-out over localhost and writes run history to disk.
 */
function labRunAllowed(): boolean {
  return !process.env.VERCEL;
}

export async function POST(request: Request) {
  if (!labRunAllowed()) {
    return NextResponse.json(
      { error: "The Quality Lab runs on a developer machine: npm run lab." },
      { status: 403 },
    );
  }

  let body: z.infer<typeof RunBody> = {};
  try {
    body = RunBody.parse(await request.json());
  } catch {
    // defaults
  }

  const { cases } = getGoldenSet();
  let targetCases = cases;
  if (body.caseId) {
    targetCases = cases.filter((c) => c.id === body.caseId);
  } else if (body.group) {
    targetCases = cases.filter((c) => c.group === body.group);
  }

  if (targetCases.length === 0) {
    return NextResponse.json({ error: "No matching cases found." }, { status: 404 });
  }

  const baseUrl = process.env.SAYONCE_BASE_URL || "http://localhost:3001";
  const results = [];

  for (const testCase of targetCases) {
    try {
      const response = await fetch(`${baseUrl}/api/fanout`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          spokenText: testCase.spokenText,
          spokenOnIso: testCase.spokenOn,
          contactSet: testCase.contactSet,
          project: "Golden Set Quality Run",
          // Golden cases use the real roster; this keeps them out of real use.
          source: "lab",
        }),
      });

      if (!response.ok) {
        results.push({
          id: testCase.id,
          group: testCase.group,
          pass: false,
          error: `HTTP ${response.status}`,
          scores: {
            inventedFacts: 1,
            privacy: 0,
            mustKnow: 0,
            routingRecall: 0,
            routingPrecision: 0,
            languageScript: 0,
            channelFit: 0,
          },
          detail: [`API error: HTTP ${response.status}`],
          trailOk: false,
        });
        continue;
      }

      const payload = await response.json();
      const graded = gradeCase(testCase, payload);
      results.push({
        id: testCase.id,
        group: testCase.group,
        pass: graded.pass,
        scores: graded.scores,
        detail: graded.detail,
        trailOk: graded.trailOk,
      });
    } catch (err) {
      results.push({
        id: testCase.id,
        group: testCase.group,
        pass: false,
        error: String(err),
        scores: {
          inventedFacts: 1,
          privacy: 0,
          mustKnow: 0,
          routingRecall: 0,
          routingPrecision: 0,
          languageScript: 0,
          channelFit: 0,
        },
        detail: [String(err)],
        trailOk: false,
      });
    }
  }

  // Calculate aggregates
  const completed = results.filter((r) => !r.error);
  const n = completed.length || 1;
  const aggregates = {
    inventedFacts: completed.reduce((sum, r) => sum + r.scores.inventedFacts, 0),
    privacy: completed.reduce((sum, r) => sum + r.scores.privacy, 0) / n,
    mustKnow: completed.reduce((sum, r) => sum + r.scores.mustKnow, 0) / n,
    routingRecall: completed.reduce((sum, r) => sum + r.scores.routingRecall, 0) / n,
    routingPrecision: completed.reduce((sum, r) => sum + r.scores.routingPrecision, 0) / n,
    languageScript: completed.reduce((sum, r) => sum + r.scores.languageScript, 0) / n,
    channelFit: completed.reduce((sum, r) => sum + r.scores.channelFit, 0) / n,
  };

  const allPassed =
    aggregates.inventedFacts === 0 &&
    aggregates.privacy === 1 &&
    aggregates.mustKnow >= TARGETS.mustKnow.target &&
    aggregates.routingRecall >= TARGETS.routingRecall.target &&
    aggregates.routingPrecision >= TARGETS.routingPrecision.target;

  const runRecord = {
    at: new Date().toISOString(),
    model: env.model,
    graderTemperature: env.graderTemperature,
    caseCount: results.length,
    passedCount: results.filter((r) => r.pass).length,
    allPassed,
    aggregates,
    results,
  };

  if (!existsSync(LAB_DIR)) mkdirSync(LAB_DIR, { recursive: true });
  const filename = `run-${runRecord.at.replace(/[:.]/g, "-")}.json`;
  writeFileSync(join(LAB_DIR, filename), JSON.stringify(runRecord, null, 2), "utf8");

  return NextResponse.json(runRecord);
}

interface GoldenCaseRaw {
  id: string;
  group: string;
  spokenText: string;
  expectedRecipients: string[];
  mustKnow?: Record<string, string[]>;
  blocked?: Record<string, string[]>;
  notes?: string;
}

interface FanoutCardRaw {
  messageId?: string;
  contact: { id: string; name: string };
  draft: { body: string; channel: string; subject?: string } | null;
  check?: {
    ok: boolean;
    failures: Array<{ code: string; message: string }>;
  } | null;
}

interface FanoutPayloadRaw {
  cards?: FanoutCardRaw[];
  trail?: unknown[];
  trailVerdict?: { ok: boolean; length: number };
}

function gradeCase(testCase: GoldenCaseRaw, payload: FanoutPayloadRaw) {
  const cards = payload.cards ?? [];
  const chosen = cards.filter((c) => c.draft !== null).map((c) => c.contact.id);
  const expected = testCase.expectedRecipients ?? [];

  const truePositives = chosen.filter((id: string) => expected.includes(id)).length;
  const routingRecall = expected.length === 0 ? 1 : truePositives / expected.length;
  const routingPrecision = chosen.length === 0 ? (expected.length === 0 ? 1 : 0) : truePositives / chosen.length;

  let inventedFacts = 0;
  let privacyBreaches = 0;
  let scriptFailures = 0;
  let channelFailures = 0;
  const detail: string[] = [];

  for (const card of cards) {
    for (const failure of card.check?.failures ?? []) {
      if (failure.code.startsWith("invented-")) inventedFacts += 1;
      if (failure.code === "blocked-fact-leak") privacyBreaches += 1;
      if (failure.code === "wrong-script") scriptFailures += 1;
      if (["missing-subject", "subject-too-long", "body-too-long", "markdown-in-whatsapp"].includes(failure.code)) {
        channelFailures += 1;
      }
      detail.push(`${card.contact.id}: ${failure.code} — ${failure.message}`);
    }
  }

  for (const [contactId, blockedItems] of Object.entries(testCase.blocked ?? {})) {
    const card = cards.find((c) => c.contact.id === contactId);
    if (!card?.draft) continue;
    const haystack = `${card.draft.subject ?? ""} ${card.draft.body}`.toLowerCase();
    for (const item of blockedItems as string[]) {
      const content = item.toLowerCase().split(/\W+/).filter((w) => w.length > 3);
      if (content.length === 0) continue;
      const hits = content.filter((w) => haystack.includes(w)).length;
      if (hits / content.length >= 0.6) {
        privacyBreaches += 1;
        detail.push(`${contactId}: LEAK of "${item}"`);
      }
    }
  }

  let mustKnowTotal = 0;
  let mustKnowCovered = 0;
  for (const [contactId, items] of Object.entries(testCase.mustKnow ?? {})) {
    const card = cards.find((c) => c.contact.id === contactId);
    for (const item of items as string[]) {
      mustKnowTotal += 1;
      if (!card?.draft) {
        detail.push(`${contactId}: no draft, so must-know "${item}" missing`);
        continue;
      }
      const haystack = card.draft.body.toLowerCase();
      const content = item.toLowerCase().split(/\W+/).filter((w) => w.length > 2);
      const hits = content.filter((w) => haystack.includes(w)).length;
      if (content.length > 0 && hits / content.length >= 0.6) mustKnowCovered += 1;
      else detail.push(`${contactId}: missing must-know "${item}"`);
    }
  }

  const draftCount = cards.filter((c) => c.draft !== null).length || 1;
  const scores = {
    inventedFacts,
    privacy: privacyBreaches === 0 ? 1 : 0,
    mustKnow: mustKnowTotal === 0 ? 1 : mustKnowCovered / mustKnowTotal,
    routingRecall,
    routingPrecision,
    languageScript: 1 - scriptFailures / draftCount,
    channelFit: 1 - channelFailures / draftCount,
  };

  const pass =
    scores.inventedFacts === 0 &&
    scores.privacy === 1 &&
    scores.mustKnow >= TARGETS.mustKnow.target &&
    scores.routingRecall >= TARGETS.routingRecall.target &&
    scores.routingPrecision >= TARGETS.routingPrecision.target;

  return { pass, scores, detail, trailOk: payload.trailVerdict?.ok ?? false };
}
