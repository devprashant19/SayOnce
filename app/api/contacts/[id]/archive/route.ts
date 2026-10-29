import { NextResponse } from "next/server";
import { archiveContact } from "@/lib/contact-repo";

export const runtime = "nodejs";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    await archiveContact(id);
    return NextResponse.json({ ok: true, id });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to archive contact" },
      { status: 500 },
    );
  }
}

