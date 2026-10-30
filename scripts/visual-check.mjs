#!/usr/bin/env node
/**
 * Screenshot every route and fail on layout defects.
 *
 *   npm run visual            # all routes, 4 widths, both themes
 *   npm run visual -- --route /app --width 375
 *   npm run visual -- --open  # also write an HTML contact sheet
 *
 * Why this exists: an agent that never looks at its output ships overlapping
 * text. Screenshots alone do not help either, because nobody compares 56 PNGs
 * by eye. So this does both — it captures the images AND runs five checks the
 * browser can answer definitively:
 *
 *   1. Horizontal overflow     the page scrolls sideways
 *   2. Element overflow        a box sticks out past the viewport
 *   3. Text overlap            two text boxes intersect
 *   4. Clipped text            content is cut off by its own container
 *   5. Touch target size       an interactive element under 44px
 *
 * Needs the app running. Start it first:  npm run build && npm run start
 */

import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { AUDIT } from "./layout-audit.mjs";

let chromium;
try {
  ({ chromium } = await import("playwright"));
} catch {
  console.error(
    "Playwright is not installed.\n\n" +
      "  npm i -D playwright\n" +
      "  npx playwright install chromium\n",
  );
  process.exit(1);
}

const BASE = process.env.SAYONCE_BASE_URL ?? "http://localhost:3000";
const OUT = join(process.cwd(), ".visual");

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : null;
};

const ALL_ROUTES = ["/", "/app", "/people", "/log", "/lab", "/proof", "/demo"];
const ALL_WIDTHS = [375, 768, 1024, 1440];

/**
 * Git Bash on Windows prefixes a leading-slash argument with the Git install
 * path, so "/" arrives as "C:/Program Files/Git/" and "/demo" arrives as
 * "C:/Program Files/Git/demo". Strip the prefix and keep whatever followed it —
 * collapsing the whole thing to "/" would silently audit the wrong page and
 * report it clean, which is worse than failing. Accepts "app" as well as "/app".
 */
function normalizeRoute(raw) {
  let value = String(raw ?? "").trim().split("\\").join("/");
  if (!value) return "/";
  // "C:/Program Files/Git/demo" -> "demo";  "C:/Program Files/Git/" -> ""
  const gitPrefix = value.match(/^[A-Za-z]:\/.*?\/Git\/(.*)$/);
  if (gitPrefix) value = gitPrefix[1];
  else if (/^[A-Za-z]:\//.test(value)) {
    // Some other absolute path reached us — a route cannot be one.
    throw new Error(
      `--route got an absolute path (${raw}). In Git Bash, pass it as "--route app" ` +
        `or escape it as "--route //demo".`,
    );
  }
  value = value.replace(/^\/+/, "");
  return value ? `/${value}` : "/";
}

const routes = flag("--route")
  ? flag("--route").split(",").map(normalizeRoute)
  : ALL_ROUTES;
const widths = flag("--width") ? [Number(flag("--width"))] : ALL_WIDTHS;
const themes = flag("--theme") ? [flag("--theme")] : ["light", "dark"];
const reducedMotion = args.includes("--reduced-motion");

mkdirSync(OUT, { recursive: true });


const browser = await chromium.launch();
const findings = [];
const shots = [];

console.log(`Visual check against ${BASE}`);
console.log(
  `${routes.length} route(s) × ${widths.length} width(s) × ${themes.length} theme(s)` +
    (reducedMotion ? " + reduced motion" : "") +
    "\n",
);

for (const theme of themes) {
  for (const width of widths) {
    const context = await browser.newContext({
      viewport: { width, height: 900 },
      colorScheme: theme,
      deviceScaleFactor: 1,
      ...(reducedMotion ? { reducedMotion: "reduce" } : {}),
    });
    // The app ignores the OS colour scheme and is light unless the person
    // chose dark, so emulating prefers-color-scheme alone would screenshot the
    // light page twice and call the second one "dark". Make the choice the way
    // a person does: the stored preference the toggle writes.
    await context.addInitScript((wanted) => {
      try {
        localStorage.setItem("sayonce-theme", wanted);
      } catch {
        // Storage can be blocked; the assertion below catches the result.
      }
    }, theme);
    const page = await context.newPage();

    for (const route of routes) {
      const label = `${route.replace(/\//g, "_") || "_root"}-${width}-${theme}${reducedMotion ? "-rm" : ""}`;
      try {
        const response = await page.goto(`${BASE}${route}`, {
          waitUntil: "networkidle",
          timeout: 45_000,
        });
        const status = response?.status() ?? 0;

        if (status >= 400) {
          findings.push({ route, width, theme, problems: [{ kind: "http", detail: `HTTP ${status}` }] });
          console.log(`  ${label}  HTTP ${status}`);
          continue;
        }

        // Scroll the whole page once so scroll-triggered reveals fire. Otherwise
        // below-the-fold sections stay at opacity 0, the screenshot shows blank
        // space, and the audit skips them as invisible.
        await page.evaluate(async () => {
          const step = Math.max(200, Math.floor(window.innerHeight * 0.8));
          for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
            window.scrollTo(0, y);
            await new Promise((r) => setTimeout(r, 60));
          }
          window.scrollTo(0, 0);
        });

        // Let entrance animations settle so a mid-flight frame is not audited.
        await page.waitForTimeout(700);

        const file = join(OUT, `${label}.png`);
        await page.screenshot({ path: file, fullPage: true });
        shots.push({ label, file: `${label}.png`, route, width, theme });

        const problems = await page.evaluate(AUDIT);

        // A pass that audits the wrong theme reports clean while checking
        // nothing. Refuse to: confirm the page is in the theme we asked for.
        const actualTheme = await page.evaluate(() =>
          document.documentElement.classList.contains("dark") ? "dark" : "light",
        );
        if (actualTheme !== theme) {
          problems.push({
            kind: "theme-mismatch",
            detail: `asked for ${theme}, page rendered ${actualTheme}`,
          });
        }
        if (problems.length > 0) findings.push({ route, width, theme, problems });

        console.log(
          `  ${label.padEnd(34)} ${problems.length === 0 ? "clean" : `${problems.length} problem(s)`}`,
        );
      } catch (error) {
        findings.push({
          route,
          width,
          theme,
          problems: [{ kind: "error", detail: String(error).slice(0, 180) }],
        });
        console.log(`  ${label}  ERROR`);
      }
    }
    await context.close();
  }
}

await browser.close();

// --- contact sheet ---------------------------------------------------------
if (args.includes("--open") && shots.length > 0) {
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<title>SayOnce visual check</title>
<style>
 body{font:14px system-ui;margin:0;padding:24px;background:#0f172a;color:#f8fafc}
 h1{font-size:18px;margin:0 0 16px}
 .grid{display:grid;gap:20px;grid-template-columns:repeat(auto-fill,minmax(320px,1fr))}
 figure{margin:0;background:#182030;border-radius:8px;overflow:hidden}
 img{width:100%;display:block;border-bottom:1px solid #1f293d}
 figcaption{padding:8px 10px;font-family:ui-monospace,monospace;font-size:12px}
</style></head><body>
<h1>SayOnce visual check — ${shots.length} screens</h1>
<div class="grid">
${shots.map((s) => `<figure><img src="${s.file}" alt="${s.label}" loading="lazy"><figcaption>${s.label}</figcaption></figure>`).join("\n")}
</div></body></html>`;
  writeFileSync(join(OUT, "index.html"), html, "utf8");
  console.log(`\nContact sheet: ${join(OUT, "index.html").replace(process.cwd(), ".")}`);
}

// --- report ---------------------------------------------------------------
console.log(`\n${shots.length} screenshot(s) in ${OUT.replace(process.cwd(), ".")}`);

if (findings.length === 0) {
  console.log("\nNo overlaps, no overflow, no clipped text, no small targets. Clean.");
  process.exit(0);
}

const byKind = new Map();
for (const f of findings) {
  for (const p of f.problems) {
    byKind.set(p.kind, (byKind.get(p.kind) ?? 0) + 1);
  }
}

console.error("\nLayout problems found:\n");
for (const finding of findings) {
  console.error(`  ${finding.route} @ ${finding.width}px ${finding.theme}`);
  const seen = new Set();
  for (const p of finding.problems) {
    const key = `${p.kind}:${p.detail}`;
    if (seen.has(key)) continue;
    seen.add(key);
    console.error(`    [${p.kind}] ${p.detail}`);
  }
  console.error("");
}

console.error("Summary:");
for (const [kind, count] of [...byKind].sort((a, b) => b[1] - a[1])) {
  console.error(`  ${String(count).padStart(4)}  ${kind}`);
}
console.error(
  "\nFix each one, then re-run. Look at the screenshots too — these checks " +
    "catch geometry, not whether the page reads well.",
);
process.exit(1);
