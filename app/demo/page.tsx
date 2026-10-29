import { redirect } from "next/navigation";

/**
 * Entry point for judges: /demo
 *
 * Automatically opens the SayOnce application in isolated demo mode with
 * pre-filled sample update and the guided tour banner ready.
 */
export default function DemoPage() {
  redirect("/app?demo=1");
}

