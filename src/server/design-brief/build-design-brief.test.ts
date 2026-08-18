import { describe, expect, it } from "vitest";
import { isDesignBriefChatIntent } from "./build-design-brief";

describe("isDesignBriefChatIntent", () => {
  it("matches brief request phrases", () => {
    expect(isDesignBriefChatIntent("Show me my brief")).toBe(true);
    expect(isDesignBriefChatIntent("Can you summarize my design plan?")).toBe(
      true,
    );
    expect(isDesignBriefChatIntent("export my brief please")).toBe(true);
    expect(isDesignBriefChatIntent("What's the design brief look like")).toBe(
      true,
    );
  });

  it("ignores unrelated messages", () => {
    expect(isDesignBriefChatIntent("I want a modern sofa")).toBe(false);
    expect(isDesignBriefChatIntent("brief me on rugs")).toBe(false);
  });
});
