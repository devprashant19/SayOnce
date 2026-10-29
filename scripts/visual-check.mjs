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

/**
 * Runs inside the page. Everything here is a question the browser can answer
 * without judgement, which is what makes it a usable gate.
 */
const AUDIT = () => {
  const problems = [];
  const vw = window.innerWidth;

  // --- 1. the page itself scrolls sideways -------------------------------
  if (document.documentElement.scrollWidth > vw + 1) {
    problems.push({
      kind: "horizontal-overflow",
      detail: `page scrollWidth ${document.documentElement.scrollWidth} > viewport ${vw}`,
    });
  }

  const describe = (el) => {
    const id = el.id ? `#${el.id}` : "";
    const cls =
      typeof el.className === "string" && el.className
        ? `.${el.className.trim().split(/\s+/).slice(0, 2).join(".")}`
        : "";
    const text = (el.textContent ?? "").trim().slice(0, 40);
    return `${el.tagName.toLowerCase()}${id}${cls}${text ? ` "${text}"` : ""}`;
  };

  const visible = (el) => {
    const style = getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden") return false;
    if (Number(style.opacity) === 0) return false;
    const r = el.getBoundingClientRect();
    return r.width > 1 && r.height > 1;
  };

  const all = [...document.querySelectorAll("body *")].filter(visible);

  /**
   * A wide data table inside a deliberate horizontal scroll region is not a
   * layout defect — it is the standard way to show a ledger on a phone. So an
   * element only counts as overflowing if no ancestor scrolls it horizontally.
   * The ancestor must itself fit the viewport, otherwise it is the thing that
   * is broken and we still want to hear about it. Check 1 above independently
   * catches the case where the *page* ends up scrolling sideways, so this
   * cannot hide a genuine escape.
   */
  const inHorizontalScroller = (el) => {
    for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
      const ox = getComputedStyle(p).overflowX;
      if (ox !== "auto" && ox !== "scroll") continue;
      if (p.scrollWidth <= p.clientWidth + 1) continue;
      const pr = p.getBoundingClientRect();
      if (pr.right <= vw + 2 && pr.left >= -2) return true;
    }
    return false;
  };

  // --- 2. a box sticks out past the viewport ------------------------------
  for (const el of all) {
    const r = el.getBoundingClientRect();
    if (getComputedStyle(el).position === "fixed") continue;
    if (inHorizontalScroller(el)) continue;
    if (r.right > vw + 2) {
      problems.push({
        kind: "element-overflow",
        detail: `${describe(el)} extends to ${Math.round(r.right)}px (viewport ${vw})`,
      });
    }
    if (r.left < -2) {
      problems.push({
        kind: "element-overflow",
        detail: `${describe(el)} starts at ${Math.round(r.left)}px`,
      });
    }
  }

  // --- 3. two pieces of text overlap -------------------------------------
  // Only leaf text elements, so a container legitimately wrapping its child
  // is not reported. Overlap must exceed 35% of the smaller box to count,
  // which tolerates sub-pixel and intentional tight stacking.
  const leafText = all.filter((el) => {
    if (!(el.textContent ?? "").trim()) return false;
    if (el.children.length > 0) return false;
    const style = getComputedStyle(el);
    if (style.position === "absolute" || style.position === "fixed") return false;
    if (style.pointerEvents === "none") return false;
    return true;
  });

  const area = (r) => Math.max(0, r.width) * Math.max(0, r.height);

  /**
   * An inline element that wraps across lines has a bounding box covering
   * every line it touches — a box that includes whitespace it does not
   * actually occupy, and usually the element that follows it. Comparing those
   * boxes invents overlaps. getClientRects() gives one box per line, which is
   * what the reader actually sees, so compare line boxes instead.
   */
  const lineBoxes = (el) =>
    [...el.getClientRects()].filter((r) => r.width > 1 && r.height > 1);

  const getFixedRoot = (el) => {
    let cur = el;
    while (cur && cur !== document.body && cur !== document.documentElement) {
      const s = getComputedStyle(cur);
      if (s.position === "fixed") return cur;
      cur = cur.parentElement;
    }
    return null;
  };

  const boxes = leafText.map(lineBoxes);
  for (let i = 0; i < leafText.length; i += 1) {
    const rootI = getFixedRoot(leafText[i]);
    for (let j = i + 1; j < leafText.length; j += 1) {
      const rootJ = getFixedRoot(leafText[j]);
      // Elements in separate fixed layers (or between a floating overlay and the static
      // document behind it) are distinct visual planes, not layout text overlaps.
      if (rootI !== rootJ) continue;

      let worst = 0;
      for (const a of boxes[i]) {
        for (const b of boxes[j]) {
          const ox = Math.min(a.right, b.right) - Math.max(a.left, b.left);
          const oy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
          if (ox <= 1 || oy <= 1) continue;
          const smaller = Math.min(area(a), area(b));
          if (smaller > 0) worst = Math.max(worst, (ox * oy) / smaller);
        }
      }
      if (worst > 0.35) {
        problems.push({
          kind: "text-overlap",
          detail: `${describe(leafText[i])} overlaps ${describe(leafText[j])} by ${Math.round(worst * 100)}%`,
        });
      }
    }
  }

  // --- 4. text clipped by its own container ------------------------------
  for (const el of leafText) {
    const style = getComputedStyle(el);
    const hidden = style.overflow === "hidden" || style.overflowY === "hidden";
    const clamped =
      style.webkitLineClamp && style.webkitLineClamp !== "none";
    const ellipsis = style.textOverflow === "ellipsis";
    if (!hidden || clamped || ellipsis) continue;
    if (el.scrollHeight > el.clientHeight + 2) {
      problems.push({
        kind: "clipped-text",
        detail: `${describe(el)} is cut off (content ${el.scrollHeight}px in ${el.clientHeight}px)`,
      });
    }
  }

  // --- 5. touch targets --------------------------------------------------
  const tappable = [
    ...document.querySelectorAll("button, a[href], [role='button'], input, select, textarea"),
  ].filter(visible);
  for (const el of tappable) {
    const r = el.getBoundingClientRect();
    if (r.height < 44 - 0.5 || r.width < 24) {
      problems.push({
        kind: "small-target",
        detail: `${describe(el)} is ${Math.round(r.width)}×${Math.round(r.height)}px (need 44px tall)`,
      });
    }
  }

  return problems;
};

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
