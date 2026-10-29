import "server-only";
import { aiCall } from "./call";
import { ROUTE_SYSTEM, routeUser } from "./prompts/route";
import { RouteResult, type Contact, type Fact } from "../types";

export interface RouteInput {
  facts: Fact[];
  contacts: Contact[];
  project?: string;
  usualForProject?: string[];
}

export async function route(input: RouteInput) {
  const result = await aiCall({
    step: "route",
    system: ROUTE_SYSTEM,
    user: routeUser({
      facts: input.facts,
      contacts: input.contacts,
      project: input.project ?? "",
      usualForProject: input.usualForProject ?? [],
    }),
    schema: RouteResult,
  });

  // Ensure every input contact has a decision entry
  const decisionMap = new Map(result.value.decisions.map((d) => [d.contactId, d]));
  const fullDecisions = input.contacts.map((contact) => {
    const existing = decisionMap.get(contact.id);
    if (existing) {
      // Privacy guarantee: strictly filter out any blocked facts
      const allowedFactIds = existing.factIds.filter((factId) => {
        const fact = input.facts.find((f) => f.id === factId);
        return fact && !fact.privacy.blockedFor.includes(contact.id);
      });
      return {
        ...existing,
        factIds: allowedFactIds,
      };
    }
    return {
      contactId: contact.id,
      include: false,
      reason: "Not affected by this update.",
      confidence: 1,
      factIds: [],
    };
  });

  const concernsNobody =
    result.value.concernsNobody || fullDecisions.every((d) => !d.include || d.factIds.length === 0);

  return {
    ...result,
    value: {
      concernsNobody,
      decisions: fullDecisions,
    },
  };
}

