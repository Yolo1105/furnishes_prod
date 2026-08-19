import { describe, expect, it } from "vitest";
import {
  isHeroPastViewport,
  parseCookieConsent,
  serializeCookieConsent,
} from "./cookie-consent";

describe("cookie-consent", () => {
  it("round-trips a consent choice through serialize/parse", () => {
    const encoded = serializeCookieConsent(
      { essential: true, analytics: true, marketing: false },
      "2026-07-17T12:00:00.000Z",
    );
    expect(parseCookieConsent(encoded)).toEqual({
      essential: true,
      analytics: true,
      marketing: false,
      recordedAt: "2026-07-17T12:00:00.000Z",
    });
  });

  it("returns null for missing or malformed payloads", () => {
    expect(parseCookieConsent(null)).toBeNull();
    expect(parseCookieConsent(undefined)).toBeNull();
    expect(parseCookieConsent("%7Bnot-json")).toBeNull();
  });

  it("returns null for JSON that is not a consent choice", () => {
    expect(parseCookieConsent(encodeURIComponent("{}"))).toBeNull();
    expect(
      parseCookieConsent(
        encodeURIComponent(
          JSON.stringify({
            essential: true,
            analytics: "yes",
            marketing: false,
          }),
        ),
      ),
    ).toBeNull();
  });

  it("treats the hero as past once its bottom is at or above the viewport top", () => {
    expect(isHeroPastViewport(1)).toBe(false);
    expect(isHeroPastViewport(0)).toBe(true);
    expect(isHeroPastViewport(-40)).toBe(true);
  });
});
