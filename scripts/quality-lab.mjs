#!/usr/bin/env node
/**
 * Quality Lab, command-line runner.
 *
 * Runs the golden set through the live pipeline and prints a table per metric.
 * Phase 4 adds the in-app /lab page, which calls the same code path — this
 * script exists first because a lab you can run before every commit catches
 * regressions that a page you have to remember to open does not.
 *
 *   npm run lab                 # the real set, falls back to the example
 *   npm run lab -- --example    # the committed example cases only
 *   npm run lab -- --case g_real_01
 *   npm run lab -- --group tricky-instruction
 *
 * Requires the dev server to be running, because the pipeline lives behind the
 * server route where the API key is. Start it with `npm run dev` first.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const BASE = process.env.SAYONCE_BASE_URL ?? "http://localhost:3000";

const args = process.argv.slice(2);
const useExample = args.includes("--example");
const onlyCase = valueOf("--case");
const onlyGroup = valueOf("--group");

function valueOf(flag) {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : null;
}

const realPath = join(ROOT, "data/golden/golden-set.json");
const examplePath = join(ROOT, "data/golden/golden-set.example.json");
const path = !useExample && existsSync(realPath) ? realPath : examplePath;

if (path === examplePath && !useExample) {
  console.warn(
    "No data/golden/golden-set.json found — running the committed example cases.\n" +
      "Phase 0 is not finished until your own 30 cases exist. See data/golden/README.md.\n",
  );
}

/** @type {Array<Record<string, any>>} */
let cases = JSON.parse(readFileSync(path, "utf8"));
if (onlyCase) cases = cases.filter((c) => c.id === onlyCase);
if (onlyGroup) cases = cases.filter((c) => c.group === onlyGroup);

if (cases.length === 0) {
  console.error("No cases matched. Check --case / --group.");
  process.exit(1);
}

// The targets from docs/07-ACCURACY-SYSTEM.md. Two are hard gates.
const TARGETS = {
  inventedFacts: { target: 0, hard: true, label: "Invented facts (count)", lowerIsBetter: true },
  privacy: { target: 1, hard: true, label: "Privacy held (share)" },
  mustKnow: { target: 0.95, hard: false, label: "Must-know coverage" },
  routingRecall: { target: 0.9, hard: false, label: "Routing recall" },
  routingPrecision: { target: 0.85, hard: false, label: "Routing precision" },
  languageScript: { target: 1, hard: false, label: "Language and script" },
  channelFit: { target: 0.95, hard: false, label: "Channel fit" },
};

console.log(`Quality Lab — ${cases.length} case(s) from ${path.replace(ROOT, ".")}`);
console.log(`Pipeline at ${BASE}\n`);

const results = [];

for (const [index, testCase] of cases.entries()) {
  process.stdout.write(`[${index + 1}/${cases.length}] ${testCase.id} (${testCase.group}) … `);
  try {
    const response = await fetch(`${BASE}/api/fanout`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        spokenText: testCase.spokenText,
        project: testCase.notes?.slice(0, 40) ?? "",
        contactSet: testCase.contactSet,
        spokenOnIso: testCase.spokenOn,
      }),
    });

    if (!response.ok) {
      results.push({
        id: testCase.id,
        group: testCase.group,
        error: `HTTP ${response.status}: ${await describeFailure(response)}`,
      });
      console.log("ERROR");
      continue;
    }

    const payload = await response.json();
    results.push({ id: testCase.id, group: testCase.group, ...grade(testCase, payload) });
    console.log(results.at(-1).pass ? "pass" : "FAIL");
  } catch (error) {
    results.push({ id: testCase.id, group: testCase.group, error: String(error) });
    console.log("ERROR");
  }
}

/**
 * A route's own error message is worth showing; a wall of HTML is not. A 404
 * HTML page means something other than SayOnce is answering on this port, and
 * saying so is more useful than 160 characters of doctype.
 */
async function describeFailure(response) {
  const body = await response.text();
  if (body.trimStart().startsWith("<")) {
    return "the server returned an HTML page, not JSON. Is something else running on this port?";
  }
  try {
    const parsed = JSON.parse(body);
    return parsed.error ?? body.slice(0, 200);
  } catch {
    return body.slice(0, 200);
  }
}

/**
 * Deterministic grading only. The AI grader is added in Phase 4 and runs
 * alongside this, never instead of it: a metric a plain function can check
 * must be checked by a plain function.
 */
function grade(testCase, payload) {
  const cards = payload.cards ?? [];
  const chosen = cards.filter((c) => c.draft !== null).map((c) => c.contact.id);
  const expected = testCase.expectedRecipients ?? [];

  const truePositives = chosen.filter((id) => expected.includes(id)).length;
  const routingRecall = expected.length === 0 ? 1 : truePositives / expected.length;
  const routingPrecision = chosen.length === 0 ? (expected.length === 0 ? 1 : 0) : truePositives / chosen.length;

  let inventedFacts = 0;
  let privacyBreaches = 0;
  let scriptFailures = 0;
  let channelFailures = 0;
  const detail = [];

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

  // Blocked facts recorded in the case, checked against the delivered bodies.
  for (const [contactId, blockedItems] of Object.entries(testCase.blocked ?? {})) {
    const card = cards.find((c) => c.contact.id === contactId);
    if (!card?.draft) continue;
    const haystack = `${card.draft.subject ?? ""} ${card.draft.body}`.toLowerCase();
    for (const item of blockedItems) {
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
    for (const item of items) {
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

// --- report ----------------------------------------------------------------

const graded = results.filter((r) => !r.error);
const errored = results.filter((r) => r.error);

// Nothing ran. Reporting a hard-gate failure here would send you debugging the
// pipeline when the problem is that the pipeline was never reached.
if (graded.length === 0) {
  console.error(`\nNo case completed — all ${errored.length} errored before grading.\n`);
  for (const result of errored.slice(0, 3)) {
    console.error(`  ${result.id}: ${result.error}`);
  }
  if (errored.length > 3) console.error(`  …and ${errored.length - 3} more, the same way`);
  console.error(
    "\nThis is a connection or configuration problem, not an accuracy result.\n" +
      `  - Is the dev server running? \`npm run dev\`, then re-run.\n` +
      `  - Is it on ${BASE}? Override with SAYONCE_BASE_URL.\n` +
      "  - Is ANTHROPIC_API_KEY set in .env.local?",
  );
  process.exit(1);
}

console.log("\nMetric                        Result    Target   Verdict");
console.log("───────────────────────────────────────────────────────────");

let allHardGatesHeld = true;
let allTargetsMet = true;

for (const [key, spec] of Object.entries(TARGETS)) {
  const values = graded.map((r) => r.scores[key]);
  const value = values.length === 0 ? 0 : spec.lowerIsBetter
    ? values.reduce((a, b) => a + b, 0)
    : values.reduce((a, b) => a + b, 0) / values.length;
  const met = spec.lowerIsBetter ? value <= spec.target : value >= spec.target;
  if (!met) {
    allTargetsMet = false;
    if (spec.hard) allHardGatesHeld = false;
  }
  const shown = spec.lowerIsBetter ? String(value) : `${(value * 100).toFixed(1)}%`;
  const target = spec.lowerIsBetter ? String(spec.target) : `${(spec.target * 100).toFixed(0)}%`;
  console.log(
    `${spec.label.padEnd(29)} ${shown.padEnd(9)} ${target.padEnd(8)} ${met ? "ok" : spec.hard ? "HARD GATE FAILED" : "below target"}`,
  );
}

const failing = graded.filter((r) => !r.pass);
console.log(
  `\n${graded.length - failing.length}/${graded.length} cases pass` +
    (errored.length > 0 ? `, ${errored.length} errored` : ""),
);

if (failing.length > 0) {
  console.log("\nFailures, with the reason to fix at its own layer:");
  for (const result of failing) {
    console.log(`\n  ${result.id} (${result.group})`);
    for (const line of result.detail.slice(0, 10)) console.log(`    ${line}`);
  }
}

for (const result of errored) {
  console.log(`\n  ${result.id}: ${result.error}`);
}

// Runs are kept so improvement is visible rather than claimed.
mkdirSync(join(ROOT, ".lab"), { recursive: true });
const runFile = join(ROOT, ".lab", `run-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
writeFileSync(runFile, JSON.stringify({ at: new Date().toISOString(), path, results }, null, 2));
console.log(`\nRun saved to ${runFile.replace(ROOT, ".")}`);

if (!allHardGatesHeld) {
  console.error("\nA hard gate failed. Zero invented facts and 100% privacy are not negotiable.");
  process.exit(2);
}
if (!allTargetsMet || errored.length > 0) {
  console.error("\nTargets not met. Fix at the right layer, then re-run the whole set.");
  process.exit(1);
}
console.log("\nAll targets met.");
