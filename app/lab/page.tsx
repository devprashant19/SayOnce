import { Placeholder } from "@/components/Placeholder";

export default function LabPage() {
  return (
    <Placeholder
      title="Quality Lab"
      phase="Phase 4"
      summary="The golden set run through the live pipeline, graded case by case. This page is the accuracy argument: a judge can read it and see whether the tool is getting better or worse."
      bullets={[
        "One button runs every golden case end to end",
        "A row per metric: invented facts, privacy, must-know coverage, routing precision and recall, language and script, tone, channel fit",
        "Pass or fail per case, scored against the targets in docs/07-ACCURACY-SYSTEM.md",
        "A history of runs, so improvement is visible rather than claimed",
      ]}
    />
  );
}
