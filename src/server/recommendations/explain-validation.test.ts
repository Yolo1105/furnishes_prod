import { describe, expect, it } from "vitest";
import {
  collectUserFactTokens,
  itemsMissingUserFactCitation,
  reasonCitesUserFacts,
} from "./explain-validation";

describe("explain-validation", () => {
  const prefs = {
    style: "japandi",
    color: "walnut",
    budget: "$6k",
    room: "living room",
  };

  it("collects style, color, and budget fragments", () => {
    const tokens = collectUserFactTokens(prefs);
    expect(tokens).toEqual(
      expect.arrayContaining(["japandi", "walnut", "6k", "$6k"]),
    );
  });

  it("passes when reason cites a confirmed fact", () => {
    expect(
      reasonCitesUserFacts(
        "Low walnut console keeps the japandi line calm inside your $6k band.",
        prefs,
      ),
    ).toBe(true);
  });

  it("fails when reason is generic", () => {
    expect(
      reasonCitesUserFacts("A nice media console for any modern home.", prefs),
    ).toBe(false);
  });

  it("counts missing citations across items", () => {
    expect(
      itemsMissingUserFactCitation(
        [
          { reasonWhyItFits: "Matches your japandi direction." },
          { reasonWhyItFits: "Looks great in open plans." },
        ],
        prefs,
      ),
    ).toBe(1);
  });

  it("skips enforcement when preferences are empty", () => {
    expect(reasonCitesUserFacts("Anything goes.", {})).toBe(true);
    expect(
      itemsMissingUserFactCitation([{ reasonWhyItFits: "Generic." }], {}),
    ).toBe(0);
  });
});
