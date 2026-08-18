import { afterEach, describe, expect, it } from "vitest";
import { blocksForEmailVerification } from "./email-verification";

const original = process.env.REQUIRE_EMAIL_VERIFICATION;

afterEach(() => {
  if (original === undefined) delete process.env.REQUIRE_EMAIL_VERIFICATION;
  else process.env.REQUIRE_EMAIL_VERIFICATION = original;
});

describe("blocksForEmailVerification", () => {
  it("never blocks while the flag is off", () => {
    delete process.env.REQUIRE_EMAIL_VERIFICATION;
    expect(blocksForEmailVerification({ emailVerifiedAt: null })).toBe(false);

    process.env.REQUIRE_EMAIL_VERIFICATION = "0";
    expect(blocksForEmailVerification({ emailVerifiedAt: null })).toBe(false);
  });

  it("blocks unverified users when the flag is on", () => {
    process.env.REQUIRE_EMAIL_VERIFICATION = "1";
    expect(blocksForEmailVerification({ emailVerifiedAt: null })).toBe(true);
  });

  it("allows verified users when the flag is on", () => {
    process.env.REQUIRE_EMAIL_VERIFICATION = "1";
    expect(blocksForEmailVerification({ emailVerifiedAt: new Date() })).toBe(
      false,
    );
  });
});
