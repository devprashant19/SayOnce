import { NextResponse } from "next/server";
import { z } from "zod";
import { listContacts, saveContact } from "@/lib/contact-repo";
import { bundledSetFor, loadContactSet } from "@/lib/contact-sets";
import { Contact } from "@/lib/types";

export const runtime = "nodejs";

const CreateContactInput = Contact.omit({ id: true }).extend({
  id: z.string().optional(),
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const dataset = searchParams.get("dataset") ?? "real";

  let contacts: Contact[] | null = null;
  try {
    contacts = await listContacts(dataset);
  } catch (error) {
    console.error("Failed to load contacts:", error);
  }

  // Nothing stored, or the store could not be read: show the bundled roster,
  // the same people a fan-out writes to. Production once showed "0 contacts"
  // for every roster, demo teams included, because the store read failed.
  if (contacts === null || contacts.length === 0) {
    const bundled = bundledSetFor(dataset);
    if (bundled) {
      return NextResponse.json({ contacts: loadContactSet(bundled), source: "bundled" });
    }
  }

  if (contacts === null) {
    // Never the raw error: it carried a server path to the page.
    return NextResponse.json({ error: "Contacts could not be loaded." }, { status: 500 });
  }
  return NextResponse.json({ contacts, source: "stored" });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const dataset = body.dataset ?? "real";
    const validated = CreateContactInput.parse(body.contact ?? body);

    const saved = await saveContact(validated, dataset);
    return NextResponse.json({ contact: saved });
  } catch (error) {
    console.error("Failed to save contact:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Some contact fields are missing or invalid." },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: "The contact could not be saved." }, { status: 500 });
  }
}
