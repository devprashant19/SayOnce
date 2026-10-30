import { describe, it, expect, vi } from "vitest";

/**
 * The local file store is what runs when no DATABASE_URL is set — every
 * laptop, and every recording of the demo made on one. Its getAllUpdates once
 * returned every dataset, so /proof reported 65 "real updates" from a store
 * holding none: all 65 were demo fan-outs. This pins the store to the same
 * dataset filter the database path has always applied.
 */
const STORED_UPDATES = [
  { id: "u_real", dataset: "real", createdAt: "2026-10-30T10:00:00.000Z", rawText: "real one" },
  { id: "u_india", dataset: "india", createdAt: "2026-10-30T11:00:00.000Z", rawText: "demo india" },
  { id: "u_global", dataset: "global", createdAt: "2026-10-30T12:00:00.000Z", rawText: "demo global" },
  { id: "u_lab", dataset: "lab", createdAt: "2026-10-30T13:00:00.000Z", rawText: "golden case" },
  { id: "u_session", dataset: "demo_abc", createdAt: "2026-10-30T14:00:00.000Z", rawText: "judge" },
].map((u) => ({
  spokenOn: "2026-10-30",
  timeZone: "Asia/Kolkata",
  project: "",
  summary: "",
  decisions: [],
  elapsedSeconds: null,
  ...u,
}));

const isStoreFile = (p: unknown, name: string) =>
  /[\\/]data[\\/]store[\\/]/.test(String(p)) && String(p).endsWith(name);

vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs")>();
  return {
    ...actual,
    existsSync: (p: Parameters<typeof actual.existsSync>[0]) =>
      /[\\/]data[\\/]store/.test(String(p)) ? true : actual.existsSync(p),
    mkdirSync: (() => undefined) as unknown as typeof actual.mkdirSync,
    readFileSync: ((p: Parameters<typeof actual.readFileSync>[0], ...rest: unknown[]) => {
      if (isStoreFile(p, "updates.json")) return JSON.stringify(STORED_UPDATES);
      if (isStoreFile(p, ".json")) return "[]";
      return (actual.readFileSync as (...a: unknown[]) => unknown)(p, ...rest);
    }) as typeof actual.readFileSync,
  };
});

// Force the file-store path: with a DATABASE_URL the repo queries Postgres.
delete process.env.DATABASE_URL;

describe("the local store keeps datasets apart", () => {
  it("returns only the real dataset by default", async () => {
    const { getAllUpdates } = await import("@/lib/update-repo");
    const rows = await getAllUpdates();
    expect(rows.map((r) => r.id)).toEqual(["u_real"]);
  });

  it("returns only the dataset asked for", async () => {
    const { getAllUpdates } = await import("@/lib/update-repo");
    expect((await getAllUpdates("india")).map((r) => r.id)).toEqual(["u_india"]);
    expect((await getAllUpdates("lab")).map((r) => r.id)).toEqual(["u_lab"]);
  });

  it("never lets demo, lab or judge-session rows into real use", async () => {
    const { realUseEvidence } = await import("@/lib/proof");
    const evidence = await realUseEvidence();
    // One real update, two words. Before the fix this counted all five.
    expect(evidence.updateCount).toBe(1);
    expect(evidence.wordsSpoken).toBe(2);
  });
});
