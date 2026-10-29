import { NextResponse } from "next/server";
import { appendCustomTrailEntry } from "@/lib/update-repo";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const updateId = String(body.updateId ?? "").trim();
    const choice = body.choice as "add-correction" | "ignore" | "supersede";
    const contradictionId = String(body.contradictionId ?? "");
    const alert = body.alert ?? {};

    if (!updateId || !choice) {
      return NextResponse.json(
        { error: "updateId and choice are required" },
        { status: 400 },
      );
    }

    const trailEntry = await appendCustomTrailEntry({
      updateId,
      actor: "user",
      type: "consistency-choice",
      payload: {
        choice,
        contradictionId,
        recipientId: alert.recipientId,
        topic: alert.topic,
        previousFactText: alert.previousFactText,
        currentFactText: alert.currentFactText,
        suggestedCorrection: alert.suggestedCorrection,
      },
    });

    return NextResponse.json({ success: true, trailEntry });
  } catch (err) {
    console.error("Failed to record consistency choice:", err);
    return NextResponse.json(
      { error: "Could not record consistency choice" },
      { status: 500 },
    );
  }
}
