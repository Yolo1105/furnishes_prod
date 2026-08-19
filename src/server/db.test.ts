import { describe, expect, it } from "vitest";
import { isDatabaseUnreachable } from "./db";

describe("isDatabaseUnreachable", () => {
  it("detects Prisma initialization failures", () => {
    const error = new Error("Can't reach database server at `127.0.0.1:5433`");
    error.name = "PrismaClientInitializationError";
    expect(isDatabaseUnreachable(error)).toBe(true);
  });

  it("detects Prisma connection codes", () => {
    expect(isDatabaseUnreachable({ code: "P1001", message: "down" })).toBe(
      true,
    );
    expect(isDatabaseUnreachable({ code: "P1017", message: "closed" })).toBe(
      true,
    );
  });

  it("does not swallow unrelated errors", () => {
    expect(isDatabaseUnreachable(new Error("Unique constraint failed"))).toBe(
      false,
    );
    expect(isDatabaseUnreachable({ code: "P2002", message: "unique" })).toBe(
      false,
    );
    expect(isDatabaseUnreachable(null)).toBe(false);
  });
});
