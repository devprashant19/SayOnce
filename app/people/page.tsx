import { Placeholder } from "@/components/Placeholder";

export default function PeoplePage() {
  return (
    <Placeholder
      title="People Book"
      phase="Phase 2"
      summary="Each person you update, added once: who they are, the language and script they read, the channel they use, how formal to be, what they care about, and anything they must never be told."
      bullets={[
        "Add, edit and delete contacts; phone numbers validated as E.164",
        "Dictate a whole contact into one box and have the form filled in for you to confirm",
        "Unclear fields are highlighted, never guessed — no invented phone numbers",
        "\"Never tell\" topics become standing locks the Route step must respect",
      ]}
    />
  );
}
