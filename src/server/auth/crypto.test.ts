import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword, digestToken } from "./crypto";

describe("auth crypto", () => {
  it("hashes and verifies passwords", async () => {
    const hash = await hashPassword("password1234");
    expect(hash.startsWith("scrypt$")).toBe(true);
    expect(await verifyPassword("password1234", hash)).toBe(true);
    expect(await verifyPassword("wrong-password", hash)).toBe(false);
  });

  it("digests tokens stably", () => {
    expect(digestToken("abc")).toBe(digestToken("abc"));
    expect(digestToken("abc")).not.toBe(digestToken("abd"));
  });

  it("keys digests with AUTH_SECRET so rotation invalidates tokens", () => {
    const original = process.env.AUTH_SECRET;
    try {
      process.env.AUTH_SECRET = "a".repeat(32);
      const before = digestToken("token");
      process.env.AUTH_SECRET = "b".repeat(32);
      expect(digestToken("token")).not.toBe(before);
    } finally {
      if (original === undefined) delete process.env.AUTH_SECRET;
      else process.env.AUTH_SECRET = original;
    }
  });
});
