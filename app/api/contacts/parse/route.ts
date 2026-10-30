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
    // This route calls the model: a raw error here can carry provider text,
    // quota messages and URLs, which must never reach the page.
    console.error("Contact dictation parse failed:", error);
    return NextResponse.json(
      { error: "That dictation could not be turned into a contact. Try saying it again, or add the contact by hand." },
      { status: 400 },
    );
  }
}

