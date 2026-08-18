import { afterEach, describe, expect, it, vi } from "vitest";
import { submitWaitlist } from "./waitlist-adapter";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("submitWaitlist", () => {
  it("rejects invalid addresses", async () => {
    await expect(submitWaitlist("nope")).resolves.toEqual({
      ok: false,
      reason: "invalid",
    });
  });

  it("returns success when the API accepts the email", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify({ joined: true }), { status: 200 }),
      ),
    );
    await expect(submitWaitlist("you@studio.com")).resolves.toEqual({
      ok: true,
    });
  });

  it("returns duplicate for the duplicate local-part", async () => {
    await expect(submitWaitlist("duplicate@studio.com")).resolves.toEqual({
      ok: false,
      reason: "duplicate",
    });
  });

  it("returns unavailable for the unavailable local-part", async () => {
    await expect(submitWaitlist("unavailable@studio.com")).resolves.toEqual({
      ok: false,
      reason: "unavailable",
    });
  });

  it("supports plus-tag demo aliases", async () => {
    await expect(submitWaitlist("demo+duplicate@studio.com")).resolves.toEqual({
      ok: false,
      reason: "duplicate",
    });
    await expect(
      submitWaitlist("demo+unavailable@studio.com"),
    ).resolves.toEqual({ ok: false, reason: "unavailable" });
  });

  it("maps API duplicate / unavailable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify({ error: "duplicate", message: "dup" }), {
            status: 409,
          }),
      ),
    );
    await expect(submitWaitlist("taken@studio.com")).resolves.toEqual({
      ok: false,
      reason: "duplicate",
    });
  });
});
