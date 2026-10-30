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
    console.error("Archive contact failed:", error);
    return NextResponse.json({ error: "The contact could not be archived." }, { status: 500 });
  }
}

