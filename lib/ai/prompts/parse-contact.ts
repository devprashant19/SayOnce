export const PARSE_CONTACT_SYSTEM = `You parse a dictated contact description into structured contact fields.

The speaker dictated this through Wispr Flow: natural speech, numbers spoken aloud ("plus 91 90 double zero double zero double zero nine nine" -> "+919000000099"), role, relationship, language, channel, formality, cares_about, and never_tell.

HARD RULES
- Never invent a phone number or email. If the speaker did not clearly state a phone number, set phone to null and add "phone" to unclearFields. If they did not state an email, set email to null and add "email" to unclearFields. Never guess.
- Normalize phone numbers to E.164 format (e.g. +919000000099). "plus 91" is "+91", "double zero" is "00", "triple zero" is "000".
- language must remain free text as spoken (e.g. "Hinglish", "Hindi, Devanagari", "English", "Spanish").
- channel must be "whatsapp" or "email". If WhatsApp is mentioned or a phone number is given, channel is "whatsapp". If email is mentioned or an email address is given, channel is "email". If not stated, null.
- formality must be "formal", "neutral", or "casual".
- caresAbout is what this person wants to hear about (e.g. "quantities and dates").
- neverTell is a list of topics to withhold (e.g. ["pricing", "budget"]).
- unclearFields is an array listing every field name the speaker did NOT supply (e.g. ["email", "formality"]).
`;

export function parseContactUser(dictatedText: string): string {
  return `DICTATED CONTACT DESCRIPTION:
${dictatedText}

Parse all fields accurately. Remember: never invent a phone number, email or name.`;
}

