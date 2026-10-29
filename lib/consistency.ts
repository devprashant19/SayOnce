import type { Fact } from "./types";

export interface PastFactEntry {
  factId: string;
  updateId: string;
  spokenOn: string;
  text: string;
  type: string;
  values: {
    numbers: string[];
    datesIso: string[];
    names: string[];
  };
  recipientIds: string[];
}

export interface ContradictionAlert {
  id: string;
  recipientId: string;
  recipientName: string;
  topic: string;
  previousFactId: string;
  previousFactText: string;
  previousSpokenOn: string;
  currentFactId: string;
  currentFactText: string;
  suggestedCorrection: string;
}

const STOPWORDS = new Set([
  "a", "an", "the", "in", "on", "at", "for", "to", "of", "and", "or", "is",
  "are", "was", "were", "be", "been", "with", "that", "this", "it", "from",
  "by", "as", "ko", "ki", "ka", "ke", "hai", "hain", "tha", "thi", "the",
  "mein", "pe", "se", "aur", "bhi", "yeh", "woh", "kar", "karna", "diya",
]);

function extractKeywords(text: string): Set<string> {
  const words = text
    .toLowerCase()
    .replace(/[^\w\s]/gu, " ")
    .split(/\s+/u)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
  return new Set(words);
}

const KEY_TOPICS = [
  "delivery",
  "deadline",
  "release",
  "milestone",
  "launch",
  "ship",
  "meeting",
  "price",
  "rate",
  "budget",
  "cost",
  "endpoint",
  "server",
  "shift",
  "order",
  "payment",
  "invoice",
  "callback",
];

function identifyTopic(textA: string, textB: string): string | null {
  const lowerA = textA.toLowerCase();
  const lowerB = textB.toLowerCase();

  for (const topic of KEY_TOPICS) {
    if (lowerA.includes(topic) && lowerB.includes(topic)) {
      return topic;
    }
  }

  // Fallback: check shared keyword overlap
  const wordsA = extractKeywords(textA);
  const wordsB = extractKeywords(textB);
  const common = [...wordsA].filter((w) => wordsB.has(w));

  if (common.length >= 2) {
    return common.join(" ");
  }
  return null;
}

export function detectContradictions(params: {
  currentFacts: Fact[];
  pastFacts: PastFactEntry[];
  recipientId: string;
  recipientName: string;
  project?: string;
}): ContradictionAlert[] {
  const alerts: ContradictionAlert[] = [];

  // Filter past facts relevant to this recipient
  const recipientPastFacts = params.pastFacts.filter(
    (pf) => pf.recipientIds.length === 0 || pf.recipientIds.includes(params.recipientId),
  );

  for (const current of params.currentFacts) {
    for (const past of recipientPastFacts) {
      // Do not compare against same fact
      if (current.id === past.factId) continue;

      const topic = identifyTopic(current.text, past.text);
      if (!topic) continue;

      let hasConflict = false;
      let pastValDesc = "";
      let currentValDesc = "";

      // 1. Date Conflict
      const currentDates = current.values?.datesIso ?? [];
      const pastDates = past.values?.datesIso ?? [];

      if (currentDates.length > 0 && pastDates.length > 0) {
        const cDate = currentDates[0];
        const pDate = pastDates[0];
        if (cDate && pDate && cDate !== pDate) {
          hasConflict = true;
          pastValDesc = pDate;
          currentValDesc = cDate;
        }
      }

      // Also check weekday/relative words if ISO dates were not tagged
      if (!hasConflict) {
        const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
        const pastDay = days.find((d) => past.text.toLowerCase().includes(d));
        const currentDay = days.find((d) => current.text.toLowerCase().includes(d));

        if (pastDay && currentDay && pastDay !== currentDay) {
          hasConflict = true;
          pastValDesc = pastDay;
          currentValDesc = currentDay;
        }
      }

      // 2. Number / Quantity / Price Conflict
      if (!hasConflict) {
        const currentNums = current.values?.numbers ?? [];
        const pastNums = past.values?.numbers ?? [];

        if (currentNums.length > 0 && pastNums.length > 0) {
          const cNum = currentNums[0];
          const pNum = pastNums[0];
          if (cNum && pNum && cNum !== pNum) {
            hasConflict = true;
            pastValDesc = pNum;
            currentValDesc = cNum;
          }
        }
      }

      // 3. Endpoint / Status Conflict
      if (!hasConflict && topic === "endpoint") {
        const urlMatchCurrent = current.text.match(/\/[a-zA-Z0-9_/]+/);
        const urlMatchPast = past.text.match(/\/[a-zA-Z0-9_/]+/);
        if (urlMatchCurrent && urlMatchPast && urlMatchCurrent[0] !== urlMatchPast[0]) {
          hasConflict = true;
          pastValDesc = urlMatchPast[0];
          currentValDesc = urlMatchCurrent[0];
        }
      }

      // Check if current text is simply a reconfirmation (e.g. same value) -> NOT a conflict
      if (pastValDesc && currentValDesc && pastValDesc === currentValDesc) {
        hasConflict = false;
      }

      if (hasConflict) {
        const alertId = `contra-${past.factId}-${current.id}`;
        // Prevent duplicate alerts for the same fact pair
        if (!alerts.some((a) => a.id === alertId)) {
          const suggestedCorrection = `Update: ${topic} moves from ${pastValDesc} to ${currentValDesc}.`;
          alerts.push({
            id: alertId,
            recipientId: params.recipientId,
            recipientName: params.recipientName,
            topic,
            previousFactId: past.factId,
            previousFactText: past.text,
            previousSpokenOn: past.spokenOn,
            currentFactId: current.id,
            currentFactText: current.text,
            suggestedCorrection,
          });
        }
      }
    }
  }

  return alerts;
}
