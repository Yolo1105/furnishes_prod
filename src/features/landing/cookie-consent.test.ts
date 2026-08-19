import { describe, expect, it } from "vitest";
import {
  cookieBannerOfferedOnSection,
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

  it("offers the banner on every section except Home", () => {
    expect(cookieBannerOfferedOnSection("home")).toBe(false);
    expect(cookieBannerOfferedOnSection("about")).toBe(true);
    expect(cookieBannerOfferedOnSection("experience")).toBe(true);
    expect(cookieBannerOfferedOnSection("studio")).toBe(true);
  });
});
