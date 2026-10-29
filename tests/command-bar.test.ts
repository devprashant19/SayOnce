import { describe, expect, it } from "vitest";
import { parseCommand } from "../lib/command-bar";

describe("Voice Command Bar Parser (Phase 6)", () => {
  it("1. handles 'send everyone except Ramesh'", () => {
    const cmd = parseCommand("send everyone except Ramesh");
    expect(cmd.action).toBe("send_selected");
    expect(cmd.targets).toEqual(["all"]);
    expect(cmd.excludeTargets).toEqual(["Ramesh"]);
    expect(cmd.requiresConfirmation).toBe(true);
    expect(cmd.confirmationMessage).toContain("Ramesh");
  });

  it("2. handles 'send all' / 'send everyone'", () => {
    const cmd = parseCommand("send everyone");
    expect(cmd.action).toBe("send_selected");
    expect(cmd.targets).toEqual(["all"]);
    expect(cmd.excludeTargets).toEqual([]);
    expect(cmd.requiresConfirmation).toBe(true);
  });

  it("3. handles 'send Priya'", () => {
    const cmd = parseCommand("send Priya");
    expect(cmd.action).toBe("send_selected");
    expect(cmd.targets).toEqual(["Priya"]);
    expect(cmd.requiresConfirmation).toBe(false);
  });

  it("4. handles 'make the boss version shorter'", () => {
    const cmd = parseCommand("make the boss version shorter");
    expect(cmd.action).toBe("modify_draft");
    expect(cmd.targets).toEqual(["boss"]);
    expect(cmd.params.style).toBe("shorter");
  });

  it("5. handles 'switch Priya's to Hindi'", () => {
    const cmd = parseCommand("switch Priya's to Hindi");
    expect(cmd.action).toBe("switch_language");
    expect(cmd.targets).toEqual(["Priya"]);
    expect(cmd.params.language).toBe("Hindi");
  });

  it("6. handles 'switch Suresh to Roman script'", () => {
    const cmd = parseCommand("switch Suresh to Roman script");
    expect(cmd.action).toBe("switch_script");
    expect(cmd.targets).toEqual(["Suresh"]);
    expect(cmd.params.script).toBe("Roman");
  });

  it("7. handles 'show me what the vendor doesn't know'", () => {
    const cmd = parseCommand("show me what the vendor doesn't know");
    expect(cmd.action).toBe("show_withheld");
    expect(cmd.targets).toEqual(["vendor"]);
  });

  it("8. handles 'switch to global team'", () => {
    const cmd = parseCommand("switch to global team");
    expect(cmd.action).toBe("switch_dataset");
    expect(cmd.params.dataset).toBe("global");
  });

  it("9. handles 'filter project Diwali retail order'", () => {
    const cmd = parseCommand("filter project Diwali retail order");
    expect(cmd.action).toBe("filter_project");
    expect(cmd.params.project).toBe("Diwali retail order");
  });

  it("10. handles 'clear' with confirmation", () => {
    const cmd = parseCommand("clear");
    expect(cmd.action).toBe("clear");
    expect(cmd.requiresConfirmation).toBe(true);
  });

  it("11. gracefully handles unrecognized commands without guessing", () => {
    const cmd = parseCommand("order a pepperoni pizza");
    expect(cmd.action).toBe("unknown");
    expect(cmd.feedback).toContain("Unrecognized command");
  });
});
