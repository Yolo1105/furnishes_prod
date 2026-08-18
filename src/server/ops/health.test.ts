import { describe, expect, it } from "vitest";
import { buildLiveness } from "./health";
import { requestIdFromHeaders } from "./log";

describe("ops health", () => {
  it("returns a minimal liveness payload", () => {
    expect(buildLiveness()).toEqual({
      status: "ok",
      application: "web",
    });
  });
});

describe("ops request id", () => {
  it("prefers x-request-id when present", () => {
    const headers = new Headers({ "x-request-id": "req-123" });
    expect(requestIdFromHeaders(headers, "fallback")).toBe("req-123");
  });

  it("falls back when missing", () => {
    expect(requestIdFromHeaders(new Headers(), "fallback")).toBe("fallback");
  });
});
