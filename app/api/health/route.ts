import { NextResponse } from "next/server";

/**
 * Uptime check. Hit by the monitor on /, /demo and /proof, and by the smoke
 * test after every deploy. Reports readiness without leaking any value.
 */
export const runtime = "nodejs";

export function GET() {
  return NextResponse.json({
    ok: true,
    at: new Date().toISOString(),
    ready: {
      ai: Boolean(process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY),
      database: Boolean(process.env.DATABASE_URL),
      demoLiveAi: (process.env.DEMO_LIVE_AI ?? "on").toLowerCase() !== "off",
    },
  });
}
