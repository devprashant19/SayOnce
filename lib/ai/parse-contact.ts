import "server-only";
import { aiCall } from "./call";
import { PARSE_CONTACT_SYSTEM, parseContactUser } from "./prompts/parse-contact";
import { ParsedContact } from "../types";

export async function parseVoiceContact(dictatedText: string) {
  const result = await aiCall({
    step: "parse-contact",
    system: PARSE_CONTACT_SYSTEM,
    user: parseContactUser(dictatedText),
    schema: ParsedContact,
  });

  return result;
}

