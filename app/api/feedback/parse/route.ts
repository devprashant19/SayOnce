import { NextResponse } from "next/server";
import { parseFeedback } from "@/lib/ai/feedback";
import type { Formality } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const feedbackText = String(body.feedbackText ?? "").trim();
    const contactId = String(body.contactId ?? "").trim();
    const contactName = String(body.contactName ?? contactId).trim();
    const currentFormality = (body.currentFormality as Formality) ?? "neutral";

    if (!feedbackText || !contactId) {
      return NextResponse.json(
        { error: "feedbackText and contactId are required" },
        { status: 400 },
      );
    }

    const proposal = await parseFeedback({
      feedbackText,
      contactId,
      contactName,
      currentFormality,
    });

    return NextResponse.json({ proposal });
  } catch (err) {
    console.error("Failed to parse feedback:", err);
    return NextResponse.json(
      { error: "Could not parse feedback. Try again." },
      { status: 500 },
    );
  }
}

