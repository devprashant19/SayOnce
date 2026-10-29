import { NextResponse } from "next/server";
import { z } from "zod";
import { markMessageSent } from "@/lib/update-repo";

export const runtime = "nodejs";

const BodySchema = z.object({
  updateId: z.string().min(1),
  contactId: z.string().min(1),
  channel: z.enum(["whatsapp", "email"]),
  sent: z.boolean().default(true),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Missing message id." }, { status: 400 });
  }

  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid body parameters." }, { status: 400 });
  }

  try {
    const result = await markMessageSent({
      messageId: id,
      updateId: body.updateId,
      contactId: body.contactId,
      channel: body.channel,
      sent: body.sent,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("markMessageSent error:", error);
    return NextResponse.json(
      { error: "Could not mark message as sent." },
      { status: 500 },
    );
  }
}

