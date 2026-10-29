import { NextResponse } from "next/server";
import { verifyChain, type TrailEntry } from "@/lib/trail";
import { getUpdateTrail } from "@/lib/update-repo";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    let entries: TrailEntry[] = body.entries;

    if (!entries && body.updateId) {
      entries = await getUpdateTrail(body.updateId);
    }

    if (!entries || !Array.isArray(entries)) {
      return NextResponse.json({ error: "Invalid trail entries" }, { status: 400 });
    }

    const verdict = verifyChain(entries);
    return NextResponse.json({ verdict, entries });
  } catch (err) {
    console.error("Failed to verify trail:", err);
    return NextResponse.json({ error: "Failed to verify trail" }, { status: 500 });
  }
}
