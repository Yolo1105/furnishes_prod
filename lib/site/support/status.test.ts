import { describe, it, expect } from "vitest";
import {
  supportStatusVariant,
  supportStatusLabel,
  isSupportThreadClosed,
} from "./status";

describe("supportStatusVariant", () => {
  it("maps help statuses correctly", () => {
    expect(supportStatusVariant("open")).toBe("active");
    expect(supportStatusVariant("awaiting_user")).toBe("warn");
    expect(supportStatusVariant("resolved")).toBe("archived");
  });

  it("maps feedback statuses correctly", () => {
    expect(supportStatusVariant("received")).toBe("active");
    expect(supportStatusVariant("under_review")).toBe("warn");
    expect(supportStatusVariant("shipped")).toBe("ok");
    expect(supportStatusVariant("wont_ship")).toBe("archived");
    expect(supportStatusVariant("declined")).toBe("archived");
  });

  it("covers all 8 statuses (exhaustiveness check)", () => {
    // If a new status is added without updating the helper, this will fail
    // because the switch won't return in all cases (TS catches at compile time
    // but this test also guards runtime).
    const statuses = [
      "open",
      "awaiting_user",
      "resolved",
      "received",
      "under_review",
      "shipped",
      "wont_ship",
      "declined",
    ] as const;
    for (const s of statuses) {
      expect(supportStatusVariant(s)).toBeDefined();
    }
  });
});

describe("supportStatusLabel", () => {
  it("returns human-readable uppercase labels", () => {
    expect(supportStatusLabel("open")).toBe("OPEN");
    expect(supportStatusLabel("awaiting_user")).toBe("AWAITING YOU");
    expect(supportStatusLabel("resolved")).toBe("RESOLVED");
    expect(supportStatusLabel("received")).toBe("RECEIVED");
    expect(supportStatusLabel("under_review")).toBe("UNDER REVIEW");
    expect(supportStatusLabel("shipped")).toBe("SHIPPED");
    expect(supportStatusLabel("wont_ship")).toBe("WON'T SHIP");
    expect(supportStatusLabel("declined")).toBe("DECLINED");
  });
});

describe("isSupportThreadClosed", () => {
  it("returns true for terminal statuses", () => {
    expect(isSupportThreadClosed("resolved")).toBe(true);
    expect(isSupportThreadClosed("shipped")).toBe(true);
    expect(isSupportThreadClosed("wont_ship")).toBe(true);
    expect(isSupportThreadClosed("declined")).toBe(true);
  });

  it("returns false for open statuses", () => {
    expect(isSupportThreadClosed("open")).toBe(false);
    expect(isSupportThreadClosed("awaiting_user")).toBe(false);
    expect(isSupportThreadClosed("received")).toBe(false);
    expect(isSupportThreadClosed("under_review")).toBe(false);
  });

  it("governs reply composer visibility", () => {
    // The view uses this helper to decide whether to show the reply input.
    // If this breaks, users can reply to closed tickets (bug) or can't
    // reply to open ones (worse bug). Locking it in a test.
    const userCanReply = (
      status: Parameters<typeof isSupportThreadClosed>[0],
    ) => !isSupportThreadClosed(status);

    expect(userCanReply("open")).toBe(true);
    expect(userCanReply("awaiting_user")).toBe(true);
    expect(userCanReply("resolved")).toBe(false);
    expect(userCanReply("shipped")).toBe(false);
  });
});
