import { describe, expect, it } from "vitest";
import { envInt } from "@/server/env";

describe("chat rate limit config", () => {
  it("parses non-negative integer limits with fallbacks", () => {
    expect(envInt("CHAT_USER_MESSAGES_PER_MINUTE", 20, {})).toBe(20);
    expect(
      envInt("CHAT_USER_MESSAGES_PER_MINUTE", 20, {
        CHAT_USER_MESSAGES_PER_MINUTE: "5",
      }),
    ).toBe(5);
    expect(
      envInt("CHAT_USER_MESSAGES_PER_MINUTE", 20, {
        CHAT_USER_MESSAGES_PER_MINUTE: "-3",
      }),
    ).toBe(20);
    expect(
      envInt("CHAT_USER_MESSAGES_PER_DAY", 200, {
        CHAT_USER_MESSAGES_PER_DAY: "0",
      }),
    ).toBe(0);
  });
});
