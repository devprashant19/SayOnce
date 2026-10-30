#!/usr/bin/env node
/**
 * Walk the judge path on production before anyone else does.
 *
 *   npm run rehearse
 *   SAYONCE_BASE_URL=http://localhost:3000 npm run rehearse
 *
 * Walks the exact path a judge takes — landing, Judge demo,
 * every guided-tour step, the fan-out, Verify trail, the command bar, the send
 * queue, then every other page — at 1920×1080, and fails on anything that
 * would undermine it: a console error, a failed request, a tour step pointing
 * at nothing, or words a viewer must never see ("quota", "undefined", "NaN").
 * Screenshots land in .visual/rehearsal/ so you can scan the run in order.
 */

import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";

const BASE = (process.env.SAYONCE_BASE_URL ?? "https://say-once-kappa.vercel.app").replace(/\/$/, "");
const OUT = join(process.cwd(), ".visual", "rehearsal");
mkdirSync(OUT, { recursive: true });

// Words that must never reach the screen on the demo path.
const FORBIDDEN = /\b(quota|undefined|NaN|\[object Object\]|RESOURCE_EXHAUSTED|api key|stack trace|ENOENT|Internal Server Error)\b/i;

const problems = [];
const problem = (where, detail) => problems.push({ where, detail });

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, colorScheme: "light" });
const page = await context.newPage();

let where = "start";
page.on("console", (m) => {
  if (m.type() === "error") problem(where, `console: ${m.text().slice(0, 200)}`);
});
page.on("pageerror", (e) => problem(where, `page error: ${String(e).slice(0, 200)}`));
page.on("response", (r) => {
  if (r.status() >= 400 && r.url().startsWith(BASE)) problem(where, `HTTP ${r.status()} ${r.url().replace(BASE, "")}`);
});

let shot = 0;
async function step(name, fn) {
  where = name;
  const started = Date.now();
  try {
    await fn();
  } catch (error) {
    problem(name, `step failed: ${String(error).split("\n")[0].slice(0, 200)}`);
  }
  shot += 1;
  await page.screenshot({ path: join(OUT, `${String(shot).padStart(2, "0")}-${name}.png`) });
  const text = await page.evaluate(() => document.body.innerText);
  const bad = text.match(FORBIDDEN);
  if (bad) problem(name, `forbidden text on screen: "${bad[0]}"`);
  console.log(`  ${name.padEnd(24)} ${((Date.now() - started) / 1000).toFixed(1)}s`);
}

const settle = (ms = 900) => page.waitForTimeout(ms);
const tourCard = () => page.locator('[role="dialog"][aria-labelledby="tour-step-title"]');

console.log(`Rehearsing against ${BASE}\n`);

await step("landing", async () => {
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await settle();
});

await step("judge-demo", async () => {
  await page.getByRole("link", { name: /judge demo/i }).first().click();
  await page.waitForURL(/\/app\?demo=1/, { timeout: 15_000 });
  await tourCard().waitFor({ timeout: 10_000 });
  await settle(1500);
});

await step("fan-out", async () => {
  const started = Date.now();
  await page.locator("#fanout-button").click();
  await page.locator("#drafts-section").waitFor({ timeout: 45_000 });
  const seconds = (Date.now() - started) / 1000;
  // A recorded fan-out must not sit on a spinner.
  if (seconds > 3) problem("fan-out", `fan-out took ${seconds.toFixed(1)}s on the demo path`);
  await settle(1500);
});

for (let n = 2; n <= 5; n += 1) {
  await step(`tour-step-${n}`, async () => {
    await tourCard().getByRole("button", { name: /^Next/i }).click();
    await settle(2200);
    const title = await tourCard().locator("#tour-step-title").innerText();
    if (!title.startsWith(`${n}.`)) problem(`tour-step-${n}`, `tour shows "${title}"`);
    const ids = { 2: "knowledge-matrix-section", 3: "drafts-section", 4: "privacy-shield-section", 5: "trail-section" };
    const box = await page.locator(`#${ids[n]}`).boundingBox();
    if (!box) problem(`tour-step-${n}`, `#${ids[n]} is not on the page`);
  });
}

await step("tour-names-match", async () => {
  // Step 4 names people; they must be the people on screen.
  const copy = await tourCard().innerText().catch(() => "");
  const drafts = await page.locator("#drafts-section").innerText();
  for (const name of copy.match(/\b[A-Z][a-z]+(?='s)\b/g) ?? []) {
    if (!drafts.includes(name)) problem("tour-names-match", `tour names "${name}", who has no card`);
  }
});

await step("verify-trail", async () => {
  await page.locator("#verify-trail-button").click();
  await settle(1500);
  const trail = await page.locator("#trail-section").innerText();
  if (!/verified|intact|valid|✓/i.test(trail)) problem("verify-trail", "no verified state after Verify trail");
});

await step("tour-done", async () => {
  const done = tourCard().getByRole("button", { name: /finish|done|close|got it/i });
  if (await done.count()) await done.first().click();
  else await page.keyboard.press("Escape");
  await settle();
  if (await tourCard().isVisible().catch(() => false)) problem("tour-done", "tour card still open");
});

await step("command-bar", async () => {
  await page.keyboard.press("Control+k");
  await settle();
  await page.keyboard.press("Escape");
});

await step("send-queue", async () => {
  await page.getByRole("button", { name: /Send all/i }).first().click();
  await settle();
});

for (const route of ["/people", "/log", "/proof", "/lab"]) {
  await step(`page${route.replace("/", "-")}`, async () => {
    await page.goto(`${BASE}${route}`, { waitUntil: "networkidle" });
    await settle();
  });
}

await browser.close();

console.log(`\n${shot} screenshot(s) in ${OUT.replace(process.cwd(), ".")}`);
if (problems.length === 0) {
  console.log("\nClean walk: nothing on the judge path is broken.");
  process.exit(0);
}
console.error("\nBroken on the judge path:\n");
for (const p of problems) console.error(`  [${p.where}] ${p.detail}`);
process.exit(1);
