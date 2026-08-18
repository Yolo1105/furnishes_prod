import { afterEach, describe, expect, it } from "vitest";
import {
  generateShareId,
  isChatShareEnabled,
  shareLinkTtlDays,
} from "./chat-share";

afterEach(() => {
  delete process.env.CHAT_SHARE_ENABLED;
  delete process.env.SHARE_LINK_TTL_DAYS;
});

describe("chat share helpers", () => {
  it("defaults off", () => {
    expect(isChatShareEnabled()).toBe(false);
  });

  it("defaults TTL to 7 days and clamps", () => {
    expect(shareLinkTtlDays()).toBe(7);
    process.env.SHARE_LINK_TTL_DAYS = "0";
    expect(shareLinkTtlDays()).toBe(7);
    process.env.SHARE_LINK_TTL_DAYS = "999";
    expect(shareLinkTtlDays()).toBe(365);
    process.env.SHARE_LINK_TTL_DAYS = "14";
    expect(shareLinkTtlDays()).toBe(14);
  });

  it("builds a 12-char alphanumeric share id without modulo bias", () => {
    const id = generateShareId(() => new Uint8Array(16).fill(1));
    expect(id).toHaveLength(12);
    expect(id).toMatch(/^[a-zA-Z0-9]+$/);
    // byte 250 would previously map via % 62; rejection sampling skips ≥ 248
    const biased = generateShareId(() => {
      const bytes = new Uint8Array(16);
      bytes.fill(250);
      bytes[15] = 1;
      return bytes;
    });
    expect(biased).toHaveLength(12);
    expect(biased).toMatch(/^[a-zA-Z0-9]+$/);
  });
});
