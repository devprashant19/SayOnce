#!/usr/bin/env node
/**
 * Seed the demo tables.
 *
 * Only demo data goes in here. Real contacts, real updates and the golden set
 * are never seeded and never uploaded — that separation is what lets SayOnce
 * be a public link with no login.
 *
 *   npm run db:seed
 *
 * Phase 2 fills this in once the schema is migrated. Until then it reports
 * what it would write, so running it is never a surprise.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const india = JSON.parse(readFileSync(join(ROOT, "data/demo/contacts-india.json"), "utf8"));
const global = JSON.parse(readFileSync(join(ROOT, "data/demo/contacts-global.json"), "utf8"));
const updates = JSON.parse(readFileSync(join(ROOT, "data/demo/updates.json"), "utf8"));

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set. Phase 2 onwards needs it; see .env.example.");
  process.exit(1);
}

console.log("Demo data ready to seed:");
console.log(`  contacts: ${india.length} Indian team, ${global.length} global team`);
console.log(`  sample updates: ${updates.length}`);
console.log("\nNot written yet — Phase 2 implements the insert against lib/db/schema.ts.");
console.log("Run `npm run db:migrate` first, then fill in this script.");
