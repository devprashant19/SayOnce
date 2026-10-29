import { NextResponse } from "next/server";
import { z } from "zod";
import { overrideMessage } from "@/lib/update-repo";

export const runtime = "nodejs";

const BodySchema = z.object({
  updateId: z.string().min(1),
  contactId: z.string().min(1),
  reason: z.string().default("Speaker override"),
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
    const result = await overrideMessage({
      messageId: id,
      updateId: body.updateId,
      contactId: body.contactId,
      reason: body.reason,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("overrideMessage error:", error);
    return NextResponse.json(
      { error: "Could not record message override." },
      { status: 500 },
    );
  }
}
