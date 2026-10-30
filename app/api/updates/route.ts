import { NextResponse } from "next/server";
import { getAllUpdates } from "@/lib/update-repo";
import { countWords } from "@/lib/voice-return";
import { env } from "@/lib/env";

export const runtime = "nodejs";

export async function GET() {
  try {
    const updates = await getAllUpdates();

    let totalSpokenWords = 0;
    let totalDeliveredWords = 0;
    let totalElapsedSeconds = 0;
    let timedUpdates = 0;
    let openCommitmentsCount = 0;

    for (const u of updates) {
      totalSpokenWords += countWords(u.rawText);
      if (u.elapsedSeconds !== null && u.elapsedSeconds > 0) {
        totalElapsedSeconds += u.elapsedSeconds;
        timedUpdates += 1;
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

    // A saving needs a measured "before": SAYONCE_BASELINE_MINUTES, the average
    // time to write the same update out by hand, timed before using the tool.
    // Until it is measured there is no saving to report — the rule /proof
    // follows. This once assumed 15 minutes per update, which nobody measured.
    const baseline = env.baselineMinutes;
    const totalMinutesSaved =
      baseline === null || timedUpdates === 0
        ? null
        : Math.max(0, Math.round(timedUpdates * baseline - totalElapsedSeconds / 60));

    return NextResponse.json({
      updates,
      metrics: {
        totalUpdates: updates.length,
        totalSpokenWords,
        totalDeliveredWords,
        // Null until something has been spoken: 0x would read as a result.
        amplification:
          totalSpokenWords > 0
            ? Number((totalDeliveredWords / totalSpokenWords).toFixed(1))
            : null,
        totalMinutesSaved,
        openCommitmentsCount,
      },
    });
  } catch (err) {
    console.error("Failed to fetch updates:", err);
    return NextResponse.json({ error: "Failed to fetch updates" }, { status: 500 });
  }
}
