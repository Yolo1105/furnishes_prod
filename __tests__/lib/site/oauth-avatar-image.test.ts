import { describe, it, expect } from "vitest";
import {
  isOptimizableOAuthAvatarUrl,
  oauthAvatarRemotePatterns,
} from "@/lib/site/oauth-avatar-image";

describe("oauth-avatar-image", () => {
  it("exposes remote patterns for next.config", () => {
    const p = oauthAvatarRemotePatterns();
    expect(p.length).toBeGreaterThan(0);
    expect(p.every((x) => x.protocol === "https" && x.pathname === "/**")).toBe(
      true,
    );
  });

  it("accepts Google/GitHub avatar URLs", () => {
    expect(
      isOptimizableOAuthAvatarUrl(
        "https://lh3.googleusercontent.com/a/ACg8ocExample",
      ),
    ).toBe(true);
    expect(
      isOptimizableOAuthAvatarUrl(
        "https://avatars.githubusercontent.com/u/1?v=4",
      ),
    ).toBe(true);
  });

  it("rejects http and unknown hosts", () => {
    expect(
      isOptimizableOAuthAvatarUrl("http://lh3.googleusercontent.com/x"),
    ).toBe(false);
    expect(isOptimizableOAuthAvatarUrl("https://evil.example/avatar.png")).toBe(
      false,
    );
  });
});
