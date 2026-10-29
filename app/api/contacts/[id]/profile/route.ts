import { NextResponse } from "next/server";
import { updateContactProfile } from "@/lib/contact-repo";
import { appendCustomTrailEntry } from "@/lib/update-repo";
import type { Formality } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: contactId } = await params;
    const body = await request.json();
    const action = body.action as "accept" | "reject";
    const updateId = String(body.updateId ?? "general");

    if (action === "accept") {
      const formality = body.formality as Formality | undefined;
      const learnedRulesToAdd = (body.learnedRulesToAdd as string[]) ?? [];

      const result = await updateContactProfile(contactId, {
        formality,
        learnedRulesToAdd,
      });

      if (updateId && updateId !== "general") {
        await appendCustomTrailEntry({
          updateId,
          actor: "user",
          type: "profile-change",
          payload: {
            contactId,
            formality,
            learnedRulesAdded: learnedRulesToAdd,
            newProfileVersion: result.profileVersion,
          },
        });
      }

      return NextResponse.json({
        success: true,
        contact: result.contact,
        profileVersion: result.profileVersion,
      });
    }

    if (action === "reject") {
      if (updateId && updateId !== "general") {
        await appendCustomTrailEntry({
          updateId,
          actor: "user",
          type: "profile-change",
          payload: {
            contactId,
            action: "rejected",
            proposal: body.proposalSummary ?? "Rejected by speaker",
          },
        });
      }

      return NextResponse.json({
        success: true,
        rejected: true,
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err) {
    console.error("Failed to update profile:", err);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}
