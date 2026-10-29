import { z } from "zod";

export const CommandActionSchema = z.enum([
  "send_selected",
  "modify_draft",
  "switch_language",
  "switch_script",
  "show_withheld",
  "switch_dataset",
  "filter_project",
  "clear",
  "unknown",
]);

export type CommandAction = z.infer<typeof CommandActionSchema>;

export const ParsedCommandSchema = z.object({
  action: CommandActionSchema,
  targets: z.array(z.string()).default([]),
  excludeTargets: z.array(z.string()).default([]),
  params: z.record(z.string(), z.string()).default({}),
  requiresConfirmation: z.boolean().default(false),
  confirmationMessage: z.string().optional(),
  feedback: z.string().default(""),
});

export type ParsedCommand = z.infer<typeof ParsedCommandSchema>;

/**
 * Parses dictated or typed commands from the voice command bar.
 * Fast deterministic regex/keyword parsing first, returning structured actions.
 */
export function parseCommand(rawText: string): ParsedCommand {
  const text = rawText.trim();

  if (!text) {
    return {
      action: "unknown",
      targets: [],
      excludeTargets: [],
      params: {},
      requiresConfirmation: false,
      feedback: "Please type or dictate a command.",
    };
  }

  // 1. "send everyone except [Name]" / "send all except [Name]"
  const exceptMatch = text.match(/send (?:everyone|all)(?: of them)? except ([\w\s]+)/i);
  if (exceptMatch && exceptMatch[1]) {
    const excluded = exceptMatch[1].trim();
    return {
      action: "send_selected",
      targets: ["all"],
      excludeTargets: [excluded],
      params: {},
      requiresConfirmation: true,
      confirmationMessage: `Send to everyone except ${excluded}?`,
      feedback: `Ready to send to everyone except ${excluded}.`,
    };
  }

  // 2. "send everyone" / "send all"
  if (/^send (?:everyone|all|all drafts)$/i.test(text)) {
    return {
      action: "send_selected",
      targets: ["all"],
      excludeTargets: [],
      params: {},
      requiresConfirmation: true,
      confirmationMessage: "Send drafts to all recipients?",
      feedback: "Ready to send to all recipients.",
    };
  }

  // 3. "send [Name]" / "send to [Name]"
  const sendTargetMatch = text.match(/^send (?:to )?([a-zA-Z]+)$/i);
  if (sendTargetMatch && sendTargetMatch[1]) {
    const target = sendTargetMatch[1].trim();
    if (target.toLowerCase() !== "everyone" && target.toLowerCase() !== "all") {
      return {
        action: "send_selected",
        targets: [target],
        excludeTargets: [],
        params: {},
        requiresConfirmation: false,
        feedback: `Ready to send draft to ${target}.`,
      };
    }
  }

  // 4. "make [target/boss] version shorter / more concise"
  const shorterMatch = text.match(/make (?:the )?([\w\s]+?)(?:'s| version)? (shorter|longer|more formal|more casual|concise)/i);
  if (shorterMatch && shorterMatch[1] && shorterMatch[2]) {
    const target = shorterMatch[1].trim();
    const style = shorterMatch[2].toLowerCase() === "concise" ? "shorter" : shorterMatch[2].toLowerCase();
    return {
      action: "modify_draft",
      targets: [target],
      excludeTargets: [],
      params: { style },
      requiresConfirmation: false,
      feedback: `Making ${target}'s draft ${style}.`,
    };
  }

  // 5. "switch [target]'s to Hindi / English / Spanish / Portuguese"
  const langMatch = text.match(/switch ([\w\s]+?)(?:'s)? (?:version |draft )?to (hindi|english|hinglish|spanish|portuguese|taglish)/i);
  if (langMatch && langMatch[1] && langMatch[2]) {
    const target = langMatch[1].trim();
    const language = langMatch[2].charAt(0).toUpperCase() + langMatch[2].slice(1).toLowerCase();
    return {
      action: "switch_language",
      targets: [target],
      excludeTargets: [],
      params: { language },
      requiresConfirmation: false,
      feedback: `Switching ${target}'s language to ${language}.`,
    };
  }

  // 6. "switch [target] to Roman script / Devanagari script"
  const scriptMatch = text.match(/switch ([\w\s]+?)(?:'s)? (?:to )?(roman|devanagari)(?: script)?/i);
  if (scriptMatch && scriptMatch[1] && scriptMatch[2]) {
    const target = scriptMatch[1].trim();
    const script = scriptMatch[2].charAt(0).toUpperCase() + scriptMatch[2].slice(1).toLowerCase();
    return {
      action: "switch_script",
      targets: [target],
      excludeTargets: [],
      params: { script },
      requiresConfirmation: false,
      feedback: `Switching ${target}'s script to ${script}.`,
    };
  }

  // 7. "show me what [target] doesn't know / cannot see"
  const hiddenMatch = text.match(/show (?:me )?what (?:the )?([\w\s]+?) (?:doesn't know|cannot see|is shielded from|does not know)/i);
  if (hiddenMatch && hiddenMatch[1]) {
    const target = hiddenMatch[1].trim();
    return {
      action: "show_withheld",
      targets: [target],
      excludeTargets: [],
      params: {},
      requiresConfirmation: false,
      feedback: `Showing shielded facts for ${target}.`,
    };
  }

  // 8. "switch to global team" / "switch to indian team" / "switch to freelance"
  const datasetMatch = text.match(/switch to (?:the )?(global|india|indian|freelance)(?: team| contacts)?/i);
  if (datasetMatch && datasetMatch[1]) {
    let dataset = datasetMatch[1].toLowerCase();
    if (dataset === "indian") dataset = "india";
    return {
      action: "switch_dataset",
      targets: [],
      excludeTargets: [],
      params: { dataset },
      requiresConfirmation: false,
      feedback: `Switched contacts to ${dataset} team.`,
    };
  }

  // 9. "filter project [Name]" / "switch project to [Name]"
  const projectMatch = text.match(/(?:filter project|switch project to|select project) ([\w\s]+)/i);
  if (projectMatch && projectMatch[1]) {
    const project = projectMatch[1].trim();
    return {
      action: "filter_project",
      targets: [],
      excludeTargets: [],
      params: { project },
      requiresConfirmation: false,
      feedback: `Selected project "${project}".`,
    };
  }

  // 10. "clear" / "clear all" / "reset"
  if (/^(?:clear|clear all|reset|start over)$/i.test(text)) {
    return {
      action: "clear",
      targets: [],
      excludeTargets: [],
      params: {},
      requiresConfirmation: true,
      confirmationMessage: "Clear current spoken update and all drafts?",
      feedback: "Ready to clear workspace.",
    };
  }

  // Unrecognized
  return {
    action: "unknown",
    targets: [],
    excludeTargets: [],
    params: {},
    requiresConfirmation: false,
    feedback: `Unrecognized command: "${rawText}". Try "send everyone except Ramesh", "make boss version shorter", "switch Priya's to Hindi", or "show what vendor doesn't know".`,
  };
}
