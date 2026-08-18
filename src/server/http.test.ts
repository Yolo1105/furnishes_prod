import { afterEach, describe, expect, it } from "vitest";
import { assertSameOrigin, clientIp } from "./http";

describe("clientIp", () => {
  afterEach(() => {
    delete process.env.TRUSTED_PROXY_HOPS;
  });

  it("takes the hop before the trusted proxies", () => {
    process.env.TRUSTED_PROXY_HOPS = "1";
    const request = new Request("http://example.test", {
      headers: { "x-forwarded-for": "203.0.113.10, 10.0.0.1" },
    });
    expect(clientIp(request)).toBe("203.0.113.10");
  });

  it("does not prefer a spoofed leftmost hop when only one proxy is trusted", () => {
    process.env.TRUSTED_PROXY_HOPS = "1";
    const request = new Request("http://example.test", {
      headers: { "x-forwarded-for": "1.2.3.4, 203.0.113.10, 10.0.0.1" },
    });
    expect(clientIp(request)).toBe("203.0.113.10");
  });
});

describe("assertSameOrigin", () => {
  it("rejects a cross-site POST", () => {
    const request = new Request("http://example.test/api/auth/login", {
      method: "POST",
      headers: { "sec-fetch-site": "cross-site" },
    });
    const response = assertSameOrigin(request);
    expect(response?.status).toBe(403);
  });

  it("allows GET", () => {
    const request = new Request("http://example.test/api/account", {
      method: "GET",
      headers: { "sec-fetch-site": "cross-site" },
    });
    expect(assertSameOrigin(request)).toBeNull();
  });
});
