import { describe, expect, it } from "vitest";
import {
  chatRolloutBucket,
  isChatOpenaiRolloutEnabled,
  isPreferenceExtractionShadowEnabled,
} from "./chat-rollout";

describe("chat rollout", () => {
  it("returns a stable 0–99 bucket for a user id", () => {
    expect(chatRolloutBucket("user-a")).toBe(chatRolloutBucket("user-a"));
    expect(chatRolloutBucket("user-a")).toBeGreaterThanOrEqual(0);
    expect(chatRolloutBucket("user-a")).toBeLessThan(100);
  });

  it("honors allowlist emails regardless of percent", () => {
    process.env.CHAT_ROLLOUT_PERCENT = "0";
    process.env.CHAT_ROLLOUT_ALLOWLIST = "ops@furnishes.local";
    expect(
      isChatOpenaiRolloutEnabled({
        userId: "anyone",
        email: "ops@furnishes.local",
      }),
    ).toBe(true);
    expect(
      isChatOpenaiRolloutEnabled({
        userId: "anyone",
        email: "other@example.com",
      }),
    ).toBe(false);
    delete process.env.CHAT_ROLLOUT_PERCENT;
    delete process.env.CHAT_ROLLOUT_ALLOWLIST;
  });

  it("uses percent bucket when no allowlist match", () => {
    process.env.CHAT_ROLLOUT_PERCENT = "100";
    delete process.env.CHAT_ROLLOUT_ALLOWLIST;
    expect(
      isChatOpenaiRolloutEnabled({ userId: "bucket-user", email: null }),
    ).toBe(true);
    process.env.CHAT_ROLLOUT_PERCENT = "0";
    expect(
      isChatOpenaiRolloutEnabled({ userId: "bucket-user", email: null }),
    ).toBe(false);
    delete process.env.CHAT_ROLLOUT_PERCENT;
  });

  it("detects shadow extraction flag", () => {
    process.env.PREFERENCE_EXTRACTION_SHADOW = "1";
    expect(isPreferenceExtractionShadowEnabled()).toBe(true);
    delete process.env.PREFERENCE_EXTRACTION_SHADOW;
    expect(isPreferenceExtractionShadowEnabled()).toBe(false);
  });
});
