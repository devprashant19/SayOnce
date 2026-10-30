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

export async function GET() {
  const database = await databaseState();
  return NextResponse.json({
    ok: true,
    at: new Date().toISOString(),
    ready: {
      ai: Boolean(process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY),
      database: database === "ok",
      demoLiveAi: (process.env.DEMO_LIVE_AI ?? "on").toLowerCase() !== "off",
    },
    database,
  });
}
