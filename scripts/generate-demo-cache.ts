import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

interface DemoUpdate {
  id: string;
  contactSet: string;
  project: string;
  label: string;
  spokenText: string;
  spokenOnIso: string;
}

const ROOT = process.cwd();
const demoUpdates: DemoUpdate[] = JSON.parse(
  readFileSync(join(ROOT, "data/demo/updates.json"), "utf8"),
);

const BASE = process.env.SAYONCE_BASE_URL ?? "http://localhost:3001";
const outPath = join(ROOT, "data/demo/cached-results.json");

async function main() {
  console.log(`Generating demo cache from live dev server at ${BASE}...`);
  let results: Record<string, unknown> = {};
  if (existsSync(outPath)) {
    try {
      results = JSON.parse(readFileSync(outPath, "utf8"));
    } catch {
      results = {};
    }
  }

  for (const sample of demoUpdates) {
    if (results[sample.id]) {
      console.log(`\nSkipping ${sample.id} (${sample.contactSet}) - already cached.`);
      continue;
    }

    console.log(`\nFetching ${sample.id} (${sample.contactSet}): "${sample.label}"`);
    const startTime = Date.now();
    const res = await fetch(`${BASE}/api/fanout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        spokenText: sample.spokenText,
        project: sample.project,
        contactSet: sample.contactSet,
        spokenOnIso: sample.spokenOnIso,
        elapsedSeconds: 12,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error(`Fanout failed for ${sample.id} (${res.status}): ${err}`);
      continue;
    }

    const data = await res.json();
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`  ✓ Received fanout in ${duration}s: ${data.facts?.length ?? 0} facts, ${data.cards?.length ?? 0} cards`);
    for (const card of data.cards ?? []) {
      if (card.draft) {
        console.log(`    - ${card.contact.name}: checkOk=${card.check?.ok} (failures: ${card.check?.failures?.length ?? 0})`);
      } else {
        console.log(`    - ${card.contact.name}: [NO DRAFT] ${card.error}`);
      }
    }

    data.cached = true;
    results[sample.id] = data;
    results[sample.spokenText.trim()] = data;

    // Save progressively
    writeFileSync(outPath, JSON.stringify(results, null, 2), "utf8");
    console.log(`  ✓ Progress saved to ${outPath}`);
  }

  console.log(`\nDone! Cache holds ${Object.keys(results).length} entries.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
