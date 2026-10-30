import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

/**
 * Uptime check. Hit by the monitor on /, /demo and /proof, and by the smoke
 * test after every deploy. Reports readiness without leaking any value.
 */
export const runtime = "nodejs";
// A health check that is cached reports the past, not the present.
export const dynamic = "force-dynamic";

type DatabaseState = "not configured" | "ok" | "tables missing" | "unreachable";

/**
 * Whether the database can actually be used, not merely whether its URL is
 * set. A configured URL with no tables behind it looked healthy here while
 * every fan-out silently failed to save and /log returned 500: the app wrote
 * nothing, so /proof could never show real use. This asks the question that
 * matters — can the updates table be read — and answers with a category only.
 */
async function databaseState(): Promise<DatabaseState> {
  const url = process.env.DATABASE_URL;
  if (!url) return "not configured";
  try {
    const sql = neon(url);
    const probe = sql`select 1 from updates limit 1`;
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("timeout")), 4000),
    );
    await Promise.race([probe, timeout]);
    return "ok";
  } catch (error) {
    // 42P01 is Postgres's "relation does not exist": the migrations never ran.
    const code = (error as { code?: string })?.code;
    return code === "42P01" ? "tables missing" : "unreachable";
  }
}

/**
 * Reads one row from every table the app reads, through the app's own query
 * layer — so the probe selects exactly the columns the pages do. A table can
 * exist and still fail the app's query if a column is missing. Each table is
 * reported as "ok" or by its Postgres SQLSTATE code (42P01: table missing,
 * 42703: column missing), which identifies the fault and carries no data.
 */
async function tableStates(): Promise<Record<string, string>> {
  const { db, schema } = await import("@/lib/db");
  const { getTableColumns } = await import("drizzle-orm");
  const database = db();
  const sql = neon(process.env.DATABASE_URL!);
  const tables = {
    updates: schema.updates,
    facts: schema.facts,
    messages: schema.messages,
    contacts: schema.contacts,
    trail_entries: schema.trailEntries,
  };
  const states: Record<string, string> = {};
  for (const [name, table] of Object.entries(tables)) {
    try {
      await database.select().from(table).limit(1);
      states[name] = "ok";
    } catch (error) {
      const code =
        (error as { code?: string })?.code ??
        (error as { cause?: { code?: string } })?.cause?.code;
      if (code !== "42703") {
        states[name] = code ? `error ${code}` : "error";
        continue;
      }
      // A column is missing: name which. Column names describe the schema,
      // not anyone's data, and they decide the repair — a few late additions
      // mean an out-of-date SayOnce schema; most missing means the URL points
      // at a different project's database, which must not be altered.
      const expected = Object.values(getTableColumns(table)).map((c) => c.name);
      const rows = (await sql`
        select column_name from information_schema.columns
        where table_schema = 'public' and table_name = ${name}
      `) as Array<{ column_name: string }>;
      const present = new Set(rows.map((r) => r.column_name));
      const missing = expected.filter((c) => !present.has(c));
      states[name] = `missing ${missing.length} of ${expected.length}: ${missing.join(", ")}`;
    }
  }
  return states;
}

export async function GET() {
  const database = await databaseState();
  const tables = database === "ok" ? await tableStates() : undefined;
  return NextResponse.json({
    ok: true,
    at: new Date().toISOString(),
    ready: {
      ai: Boolean(process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY),
      database: database === "ok" && Object.values(tables ?? {}).every((s) => s === "ok"),
      demoLiveAi: (process.env.DEMO_LIVE_AI ?? "on").toLowerCase() !== "off",
    },
    database,
    ...(tables ? { tables } : {}),
  });
}
