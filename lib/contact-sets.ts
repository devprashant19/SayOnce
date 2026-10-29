import { Contact } from "./types";
import indiaSet from "../data/demo/contacts-india.json";
import globalSet from "../data/demo/contacts-global.json";

/**
 * Contact sets.
 *
 * Phase 1 reads contacts from these fixtures; Phase 2 moves real contacts into
 * the database and keeps these as the two demo datasets a judge can switch
 * between. The demo sets never merge with real data — that separation is what
 * lets the app be public with no login.
 *
 * The global set is not decoration. It is the proof that nothing in SayOnce is
 * hard-coded for one country: language, channel, tone and honorifics are all
 * per-contact fields.
 */

const SETS: Readonly<Record<string, unknown>> = {
  india: indiaSet,
  global: globalSet,
};

export const CONTACT_SET_LABELS: Readonly<Record<string, string>> = {
  india: "Indian team",
  global: "Global team",
};

export function loadContactSet(name: string): Contact[] {
  const raw = SETS[name];
  if (!raw) throw new Error(`Unknown contact set: ${name}`);
  return Contact.array().parse(raw);
}

export function contactSetNames(): string[] {
  return Object.keys(SETS);
}
