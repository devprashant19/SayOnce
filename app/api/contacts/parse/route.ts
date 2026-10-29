import { NextResponse } from "next/server";
import { z } from "zod";
import { parseVoiceContact } from "@/lib/ai/parse-contact";

export const runtime = "nodejs";

const ParseRequest = z.object({
  text: z.string().min(1).max(2000),
});

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const body = ParseRequest.parse(json);

    const result = await parseVoiceContact(body.text);
    return NextResponse.json({ parsed: result.value });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to parse contact dictation" },
      { status: 400 },
    );
  }
}

