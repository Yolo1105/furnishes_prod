import { afterEach, describe, expect, it } from "vitest";
import {
  isChatInsightsEnabled,
  MIN_MESSAGES_FOR_INSIGHTS,
} from "./chat-insights";

afterEach(() => {
  delete process.env.CHAT_INSIGHTS_ENABLED;
});

describe("chat insights gates", () => {
  it("defaults off", () => {
    expect(isChatInsightsEnabled()).toBe(false);
  });

  it("enables when flag is 1", () => {
    process.env.CHAT_INSIGHTS_ENABLED = "1";
    expect(isChatInsightsEnabled()).toBe(true);
  });

  it("requires at least three messages before generation", () => {
    expect(MIN_MESSAGES_FOR_INSIGHTS).toBe(3);
  });
});
