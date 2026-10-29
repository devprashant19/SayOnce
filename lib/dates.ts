/**
 * Relative date resolution.
 *
 * Spoken updates almost never carry a calendar date. They carry "parso",
 * "next Monday", "day after tomorrow", "kal". The Extract step is told to
 * resolve these against the day the update was spoken, and this module is the
 * deterministic reference it is graded against — a Hinglish relative date
 * getting silently dropped is one of the failure modes the COMI-LINGUA paper
 * documents, so it is checked rather than trusted.
 */

const DAY_MS = 86_400_000;

export const WEEKDAYS = [
  "sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday",
] as const;

export function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function parseIsoDay(iso: string): Date {
  const parsed = new Date(`${iso}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) throw new Error(`Not an ISO day: ${iso}`);
  return parsed;
}

export function addDays(iso: string, days: number): string {
  return isoDay(new Date(parseIsoDay(iso).getTime() + days * DAY_MS));
}

/**
 * The next occurrence of a weekday strictly after `fromIso`. "Next Monday"
 * spoken on a Monday means the Monday a week out, not today.
 */
export function nextWeekday(fromIso: string, weekday: string): string {
  const target = WEEKDAYS.indexOf(weekday.toLowerCase() as (typeof WEEKDAYS)[number]);
  if (target < 0) throw new Error(`Not a weekday: ${weekday}`);
  const from = parseIsoDay(fromIso);
  const diff = (target - from.getUTCDay() + 7) % 7;
  return addDays(fromIso, diff === 0 ? 7 : diff);
}

export interface RelativeDate {
  /** The spoken phrase, as the speaker said it. */
  phrase: string;
  iso: string;
}

/**
 * Hindi/Hinglish and English relative-day words, resolved against the day the
 * update was spoken. "parso" is ambiguous in speech (day before yesterday or
 * day after tomorrow); SayOnce resolves it forwards, because a work update
 * about a delivery is about the future, and surfaces both readings in the UI.
 */
const OFFSETS: Readonly<Record<string, number>> = {
  today: 0, aaj: 0, hoy: 0,
  tomorrow: 1, kal: 1, manana: 1, mañana: 1,
  "day after tomorrow": 2, parso: 2, parsoon: 2,
  yesterday: -1, "beete kal": -1, ayer: -1,
  "day before yesterday": -2,
};

export function resolveRelativeDates(text: string, spokenOnIso: string): RelativeDate[] {
  const found: RelativeDate[] = [];
  const lower = text.toLowerCase();

  for (const [phrase, offset] of Object.entries(OFFSETS)) {
    const pattern = new RegExp(`\\b${phrase.replace(/\s+/g, "\\s+")}\\b`, "u");
    if (pattern.test(lower)) {
      found.push({ phrase, iso: addDays(spokenOnIso, offset) });
    }
  }

  for (const weekday of WEEKDAYS) {
    const pattern = new RegExp(`\\b(next\\s+|agle\\s+|aane\\s+wale\\s+)?${weekday}\\b`, "u");
    const match = lower.match(pattern);
    if (match) {
      found.push({
        phrase: match[0].trim(),
        iso: match[1] ? nextWeekday(spokenOnIso, weekday) : nextWeekday(addDays(spokenOnIso, -1), weekday),
      });
    }
  }

  return dedupeByPhrase(found);
}

function dedupeByPhrase(dates: RelativeDate[]): RelativeDate[] {
  const seen = new Set<string>();
  return dates.filter((d) => {
    if (seen.has(d.phrase)) return false;
    seen.add(d.phrase);
    return true;
  });
}

/** Human-readable form shown next to the ISO date, so the speaker can check it. */
export function spellOut(iso: string): string {
  const date = parseIsoDay(iso);
  const weekday = WEEKDAYS[date.getUTCDay()]!;
  const month = date.toLocaleString("en-GB", { month: "long", timeZone: "UTC" });
  const capitalised = weekday.charAt(0).toUpperCase() + weekday.slice(1);
  return `${capitalised} ${date.getUTCDate()} ${month}`;
}
