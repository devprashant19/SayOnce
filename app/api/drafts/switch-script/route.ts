import { NextResponse } from "next/server";
import { z } from "zod";
import { composeOne } from "@/lib/ai/compose";
import { checkDraft } from "@/lib/checker";
import { Contact, Fact, Draft } from "@/lib/types";

export const runtime = "nodejs";

const RequestBody = z.object({
  contact: Contact,
  facts: z.array(Fact),
  draft: Draft,
  targetScript: z.enum(["devanagari", "latin"]),
  project: z.string().default(""),
  spokenOnIso: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const body = RequestBody.parse(await req.json());
    const targetLang =
      body.targetScript === "devanagari"
        ? "Hindi, Devanagari script"
        : "Hinglish, Roman script";

    const modifiedContact: typeof body.contact = {
      ...body.contact,
      language: targetLang,
    };

    const allowedFacts = body.facts.filter(
      (f) => !f.privacy.blockedFor.includes(body.contact.id),
    );

    const composeResult = await composeOne({
      contact: modifiedContact,
      facts: allowedFacts,
      project: body.project,
      learnedRules: [
        `SCRIPT REQUIREMENT: Write strictly in ${body.targetScript === "devanagari" ? "Devanagari script (e.g. नमस्ते, डिस्पेच)" : "Roman / Latin script (e.g. Namaste, dispatch)"}.`,
      ],
    });

    const check = checkDraft({
      draft: composeResult.value,
      contact: modifiedContact,
      allowedFacts,
      allFacts: body.facts,
    });

    return NextResponse.json({
      draft: composeResult.value,
      check,
      script: body.targetScript,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Script switch failed" },
      { status: 500 },
    );
  }
}
