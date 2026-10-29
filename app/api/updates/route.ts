import { NextResponse } from "next/server";
import { getAllUpdates } from "@/lib/update-repo";
import { countWords } from "@/lib/voice-return";

export const runtime = "nodejs";

export async function GET() {
  try {
    const updates = await getAllUpdates();

    let totalSpokenWords = 0;
    let totalDeliveredWords = 0;
    let totalElapsedSeconds = 0;
    let openCommitmentsCount = 0;

    for (const u of updates) {
      totalSpokenWords += countWords(u.rawText);
      if (u.elapsedSeconds !== null && u.elapsedSeconds > 0) {
        totalElapsedSeconds += u.elapsedSeconds;
      }

      for (const m of u.messages) {
        totalDeliveredWords += countWords(m.subject ?? "") + countWords(m.body);
      }

      for (const f of u.facts) {
        if (f.commitmentStatus === "open") {
          openCommitmentsCount += 1;
        }
      }
    }

    // Baseline calculation: each update is compared to 15-minute manual baseline
    const baselineMinutes = updates.length * 15;
    const actualMinutes = totalElapsedSeconds / 60;
    const totalMinutesSaved = Math.max(0, Math.round(baselineMinutes - actualMinutes));

    return NextResponse.json({
      updates,
      metrics: {
        totalUpdates: updates.length,
        totalSpokenWords,
        totalDeliveredWords,
        amplification:
          totalSpokenWords > 0
            ? Number((totalDeliveredWords / totalSpokenWords).toFixed(1))
            : 0,
        totalMinutesSaved,
        openCommitmentsCount,
      },
    });
  } catch (err) {
    console.error("Failed to fetch updates:", err);
    return NextResponse.json({ error: "Failed to fetch updates" }, { status: 500 });
  }
}
