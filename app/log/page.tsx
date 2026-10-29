import { Placeholder } from "@/components/Placeholder";

export default function LogPage() {
  return (
    <Placeholder
      title="Update Log"
      phase="Phase 5"
      summary="The record nobody used to keep, writing itself. Every update with its date, project, summary, decisions, who was told, and whether each message was sent."
      bullets={[
        "Filter by person, project and date; search; export to CSV",
        "Every row links to its Trust Trail",
        "Consistency Guard reads this log to catch you contradicting yourself",
        "\"Who did I forget?\" uses it to spot a contact who usually hears about a project",
      ]}
    />
  );
}
