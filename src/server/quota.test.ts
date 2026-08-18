import { describe, expect, it } from "vitest";
import { assertRowQuota } from "./quota";

describe("assertRowQuota", () => {
  it("refuses when the count is at the max", async () => {
    const result = await assertRowQuota(async () => 10, 10, "projects");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("rate_limited");
  });

  it("allows when under the max", async () => {
    const result = await assertRowQuota(async () => 2, 10, "projects");
    expect(result.ok).toBe(true);
  });
});
