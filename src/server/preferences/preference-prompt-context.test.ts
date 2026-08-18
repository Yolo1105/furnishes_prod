import { describe, expect, it } from "vitest";
import {
  mergePromptPreferenceContext,
  preferenceOrigin,
} from "./preference-prompt-context";
import { emptyPreferenceMap } from "./preference-types";

const emptyProfile = {
  styleWords: null,
  budgetMinimum: null,
  budgetMaximum: null,
  budgetCurrency: null,
  projectName: null,
  projectSummary: null,
};

describe("preferenceOrigin", () => {
  it("maps extracted confirmations to chat", () => {
    expect(preferenceOrigin("extracted_confirmed")).toBe("chat");
  });

  it("maps manual sets to user", () => {
    expect(preferenceOrigin("manual_chat")).toBe("user");
    expect(preferenceOrigin("manual")).toBe("user");
  });
});

describe("mergePromptPreferenceContext", () => {
  it("labels user vs chat sources in the prompt block", () => {
    const confirmed = emptyPreferenceMap();
    confirmed.room = "living room";
    confirmed.budget = "S$5,000";
    confirmed.style = "minimal";

    const merged = mergePromptPreferenceContext({
      memoryEnabled: true,
      confirmed,
      confirmedSources: {
        room: "manual_chat",
        budget: "extracted_confirmed",
        style: "extracted_confirmed",
      },
      profile: emptyProfile,
    });

    expect(merged.preferenceBlock).toContain("[user-defined]");
    expect(merged.preferenceBlock).toContain("[from chat]");
    expect(merged.preferenceBlock).toContain(
      "Room Type: living room [user-defined]",
    );
    expect(merged.preferenceBlock).toContain(
      "Budget Range: S$5,000 [from chat]",
    );
    expect(merged.preferenceBlock).toMatch(
      /user-defined preferences as hard constraints/i,
    );
  });
});
