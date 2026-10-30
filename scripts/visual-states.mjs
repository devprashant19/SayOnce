#!/usr/bin/env node
/**
 * Screenshot and audit the app after interaction, not only as it loads.
 *
 *   npm run visual:states
 *   SAYONCE_BASE_URL=http://localhost:3000 npm run visual:states -- --width 390
 *
 * visual-check.mjs audits every page in its first state. Most of what a judge
 * sees is not a first state: a guided-tour step, the cards after a fan-out, a
 * drawer, a menu. The tour once ringed an element it had scrolled under the
 * navbar while its pane cut the Fan out button in half, and no page-load audit
 * could have seen it. Each scenario below drives one of those states, then
 * runs the same in-page checks (scripts/layout-audit.mjs) and saves a shot.
 *
 * Needs the app running: npm run build && npm run start
 */

import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";
import { AUDIT } from "./layout-audit.mjs";

const BASE = process.env.SAYONCE_BASE_URL ?? "http://localhost:3000";
const OUT = join(process.cwd(), ".visual", "states");
const args = process.argv.slice(2);
const widthArg = args.indexOf("--width");
const WIDTHS = widthArg >= 0 ? [Number(args[widthArg + 1])] : [390, 1440];
mkdirSync(OUT, { recursive: true });

const settle = (page, ms = 700) => page.waitForTimeout(ms);

async function fanOutSample(page) {
  await page.goto(`${BASE}/app`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /Delivery slipped/i }).first().click();
  await page.getByRole("button", { name: /^Fan out/i }).first().click();
  await page.getByText(/Drafted Messages/i).first().waitFor({ timeout: 20_000 });
  await settle(page, 900);
}

/** name -> drive the page into the state to audit. */
// A tour step scrolls smoothly and then lifts its control clear of the card;
// measured on a phone that settles at about 1.5s. Audit after it has landed,
// not mid-scroll.
const TOUR_SETTLE_MS = 2200;

const SCENARIOS = {
  "tour-step-1": async (page) => {
    await page.goto(`${BASE}/app?demo=1`, { waitUntil: "networkidle" });
    await page.getByRole("dialog").first().waitFor({ timeout: 8_000 });
    await settle(page, TOUR_SETTLE_MS);
  },
  ...Object.fromEntries(
    [2, 3, 4, 5].map((n) => [
      `tour-step-${n}`,
      async (page) => {
        await page.goto(`${BASE}/app?demo=1`, { waitUntil: "networkidle" });
        await page.getByRole("dialog").first().waitFor({ timeout: 8_000 });
        for (let i = 1; i < n; i += 1) {
          await page.getByRole("button", { name: /^Next/i }).first().click();
          await settle(page, TOUR_SETTLE_MS);
        }
      },
    ]),
  ),
  "app-after-fanout": fanOutSample,
  "app-command-bar": async (page) => {
    await page.goto(`${BASE}/app`, { waitUntil: "networkidle" });
    await page.keyboard.press("Control+k");
    await settle(page);
  },
  "app-send-queue": async (page) => {
    await fanOutSample(page);
    await page.getByRole("button", { name: /Send all/i }).first().click();
    await settle(page);
  },
  "people-add-form": async (page) => {
    await page.goto(`${BASE}/people`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: /Add contact manually|Add manually/i }).first().click();
    await settle(page);
  },
  "people-drawer": async (page) => {
    await page.goto(`${BASE}/people`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: /Meera|Kabir|Devendra|Anjali|Rohan/ }).first().click();
    await settle(page);
  },
  "lab-inspector": async (page) => {
    // A case opens from its square in the per-case grid.
    await page.goto(`${BASE}/lab`, { waitUntil: "networkidle" });
    await page.locator('button[title^="Case "]').first().click();
    await settle(page);
  },
  "mobile-menu": async (page) => {
    await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
    const toggle = page.getByRole("button", { name: /Open navigation menu/i });
    if (!(await toggle.isVisible())) return "skip";
    await toggle.click();
    await settle(page, 400);
  },
};

const browser = await chromium.launch();
const findings = [];
let shots = 0;
console.log(`State check against ${BASE}\n${Object.keys(SCENARIOS).length} scenarios × ${WIDTHS.length} width(s)\n`);

for (const width of WIDTHS) {
  for (const [name, drive] of Object.entries(SCENARIOS)) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    const page = await context.newPage();
    const label = `${name}-${width}`;
    try {
      const outcome = await drive(page);
      if (outcome === "skip") {
        console.log(`  ${label.padEnd(30)} n/a at this width`);
        await context.close();
        continue;
      }
      await page.screenshot({ path: join(OUT, `${label}.png`) });
      shots += 1;
      const problems = await page.evaluate(AUDIT);

      // A tour step that asks you to press something must leave it pressable:
      // on a phone, step 1 once covered the very Fan out button it named.
      const hidden = await page.evaluate(() => {
        const ACTIONS = { 1: "fanout-button", 5: "verify-trail-button" };
        const card = document.querySelector('[role="dialog"][aria-labelledby="tour-step-title"]');
        const step = Number(card?.textContent?.match(/Step (\d) of/)?.[1]);
        const action = document.getElementById(ACTIONS[step] ?? "");
        if (!card || !action) return null;
        const a = action.getBoundingClientRect();
        const c = card.getBoundingClientRect();
        const covered = a.right > c.left && a.left < c.right && a.bottom > c.top && a.top < c.bottom;
        const offscreen = a.bottom <= 0 || a.top >= window.innerHeight;
        return covered || offscreen ? `step ${step}: #${action.id} is ${covered ? "under the tour card" : "off screen"}` : null;
      });
      if (hidden) problems.push({ kind: "action-hidden", detail: hidden });
      if (problems.length > 0) findings.push({ label, problems });
      console.log(`  ${label.padEnd(30)} ${problems.length === 0 ? "clean" : `${problems.length} problem(s)`}`);
    } catch (error) {
      findings.push({ label, problems: [{ kind: "scenario-error", detail: String(error).split("\n")[0].slice(0, 160) }] });
      console.log(`  ${label.padEnd(30)} ERROR`);
    }
    await context.close();
  }
}
await browser.close();

console.log(`\n${shots} screenshot(s) in ${OUT.replace(process.cwd(), ".")}`);
if (findings.length === 0) {
  console.log("\nEvery state clean.");
  process.exit(0);
}
console.error("\nProblems found:\n");
for (const f of findings) {
  console.error(`  ${f.label}`);
  for (const p of [...new Map(f.problems.map((p) => [`${p.kind}${p.detail}`, p])).values()]) {
    console.error(`    [${p.kind}] ${p.detail}`);
  }
}
process.exit(1);
