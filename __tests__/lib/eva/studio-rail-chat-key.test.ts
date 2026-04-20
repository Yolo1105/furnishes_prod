import { describe, expect, it } from "vitest";
import { studioRailChatKey } from "@/lib/eva-dashboard/chat/rail-chat-ids";

describe("studioRailChatKey", () => {
  it("prefixes project id for isolation from other rails", () => {
    expect(studioRailChatKey("abc")).toBe("studio-abc");
  });

  it("uses a stable fallback when no project", () => {
    expect(studioRailChatKey(null)).toBe("studio-none");
  });
});
