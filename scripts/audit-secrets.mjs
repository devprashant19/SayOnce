#!/usr/bin/env node
/**
 * Pre-submission leak audit.
 *
 * Scans the built output and the tracked source for the four things that must
 * never ship: API keys, real phone numbers, real email addresses, and the
 * private files (SPEC.md, the golden set, agent instruction files).
 *
 * Run it before every deploy and again before submitting. Exits non-zero on
 * any finding, so it can gate a deploy script.
 *
 *   node scripts/audit-secrets.mjs
 */

import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join, relative, sep } from "node:path";

const ROOT = process.cwd();

const SCAN_DIRS = [".next", "public", "app", "lib", "components", "data", "scripts"];

const SKIP_DIR_NAMES = new Set(["node_modules", ".git", "cache", "types"]);

/** Demo numbers and addresses are deliberately fake and are allowed through. */
const ALLOWED = [
  /\+9190000000\d{1,2}/,
  /\+52550000000\d/,
  /\+551190000000\d/,
  /\+63900000000\d/,
  /@sayonce\.example/,
  /@example\.com/,
  /@co\.com/,
  /brian\.m\.carlson@gmail\.com/, // Bundled pg package maintainer in Next.js server chunks
  /postgresql:\/\/\$\{e\(d\.user\)\}:\$\{e\(d\.password\)\}@/, // Bundled pg-connection-string template
];

const RULES = [
  { name: "Google AI API key", pattern: /AIza[0-9A-Za-z_-]{30,}/g },
  { name: "Anthropic API key", pattern: /sk-ant-[A-Za-z0-9_-]{8,}/g },
  { name: "generic secret key", pattern: /\b(?:sk|pk)_(?:live|test)_[A-Za-z0-9]{10,}/g },
  { name: "Neon/Postgres URL with password", pattern: /postgres(?:ql)?:\/\/[^\s"'`]*:[^\s"'`@]+@/g },
  { name: "phone number", pattern: /\+\d{1,3}[\s-]?\d{4,}[\s-]?\d{3,}/g },
  { name: "email address", pattern: /\b[\w.+-]+@[\w-]+\.[a-z]{2,}\b/gi },
  { name: "private file reference", pattern: /\bSPEC\.md\b|golden-set\.json/g },
];

/** Files that are allowed to mention the private filenames. */
const RULE_EXEMPT = [
  // This rule exists to catch a private file being *referenced by shipped code
  // or present in the build*. Documentation has to be able to name the files it
  // is telling you never to commit, and docs/ is never deployed.
  { rule: "private file reference", path: /\.md$/ },
  { rule: "private file reference", path: /(?:^|[\\/])(\.gitignore|\.vercelignore|audit-secrets\.mjs|quality-lab\.mjs)$/ },
  { rule: "email address", path: /(?:^|[\\/])(package-lock\.json|audit-secrets\.mjs)$/ },
  // This script holds the demo-number patterns in its own allowlist, so it
  // matches its own rule. It is never deployed.
  { rule: "phone number", path: /(?:^|[\\/])audit-secrets\.mjs$/ },
];

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    if (SKIP_DIR_NAMES.has(name)) continue;
    const full = join(dir, name);
    const info = statSync(full);
    if (info.isDirectory()) {
      walk(full, out);
    } else if (/\.(js|mjs|cjs|ts|tsx|json|html|css|map|txt|md)$/.test(name)) {
      out.push(full);
    }
  }
  return out;
}

const findings = [];

for (const dir of SCAN_DIRS) {
  for (const file of walk(join(ROOT, dir))) {
    const rel = relative(ROOT, file).split(sep).join("/");
    let content;
    try {
      content = readFileSync(file, "utf8");
    } catch {
      continue;
    }
    for (const rule of RULES) {
      if (RULE_EXEMPT.some((e) => e.rule === rule.name && e.path.test(rel))) continue;
      for (const match of content.matchAll(rule.pattern)) {
        const value = match[0];
        if (ALLOWED.some((allowed) => allowed.test(value))) continue;
        findings.push({ rel, rule: rule.name, value, index: match.index ?? 0 });
      }
    }
  }
}

// Private files must not merely be ignored — they must not be in the build.
for (const forbidden of ["SPEC.md", "data/golden/golden-set.json", "ROLLBACK.md"]) {
  if (existsSync(join(ROOT, ".next", forbidden))) {
    findings.push({ rel: `.next/${forbidden}`, rule: "private file in build", value: forbidden, index: 0 });
  }
}

if (findings.length === 0) {
  console.log("Leak audit clean: no keys, real numbers, real addresses or private files found.");
  process.exit(0);
}

console.error(`Leak audit found ${findings.length} item(s) to review:\n`);
const byFile = new Map();
for (const finding of findings) {
  if (!byFile.has(finding.rel)) byFile.set(finding.rel, []);
  byFile.get(finding.rel).push(finding);
}
for (const [file, items] of byFile) {
  console.error(`  ${file}`);
  for (const item of items.slice(0, 8)) {
    console.error(`    ${item.rule}: ${item.value}`);
  }
  if (items.length > 8) console.error(`    …and ${items.length - 8} more`);
}
console.error(
  "\nEach of these is either a real leak to remove, or a false positive to add to ALLOWED in this script with a comment saying why.",
);
process.exit(1);
