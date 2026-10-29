import { NextResponse } from "next/server";
import { z } from "zod";
import { listContacts, saveContact } from "@/lib/contact-repo";
import { Contact } from "@/lib/types";

export const runtime = "nodejs";

const CreateContactInput = Contact.omit({ id: true }).extend({
  id: z.string().optional(),
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const dataset = searchParams.get("dataset") ?? "real";

  try {
    const contacts = await listContacts(dataset);
    return NextResponse.json({ contacts });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load contacts" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const dataset = body.dataset ?? "real";
    const validated = CreateContactInput.parse(body.contact ?? body);

    const saved = await saveContact(validated, dataset);
    return NextResponse.json({ contact: saved });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid contact data" },
      { status: 400 },
    );
  }
}
