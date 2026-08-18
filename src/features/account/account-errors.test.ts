import { describe, expect, it } from "vitest";
import { getAccountErrorMessage, isAccountApiError } from "./account-errors";

describe("account API error normalization", () => {
  it("recognizes account API errors", () => {
    expect(
      isAccountApiError({
        code: "validation",
        message: "Check fields",
        fieldErrors: { name: "Required" },
      }),
    ).toBe(true);
  });

  it("rejects unrelated values", () => {
    expect(isAccountApiError(null)).toBe(false);
    expect(isAccountApiError({ message: "nope" })).toBe(false);
  });

  it("reads account API error messages", () => {
    expect(
      getAccountErrorMessage(
        { code: "validation", message: "Too long" },
        "fallback",
      ),
    ).toBe("Too long");
    expect(getAccountErrorMessage(new Error("boom"), "fallback")).toBe("boom");
    expect(getAccountErrorMessage(null, "fallback")).toBe("fallback");
  });
});
