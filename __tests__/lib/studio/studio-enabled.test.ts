import { afterEach, describe, expect, it, vi } from "vitest";
import {
  isStudioEnabled,
  studioDisabledJsonResponse,
} from "@/lib/studio/studio-enabled";

describe("studio-enabled", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("defaults on when STUDIO_ENABLED is unset", () => {
    vi.stubEnv("STUDIO_ENABLED", "");
    expect(isStudioEnabled()).toBe(true);
  });

  it("is off for 0, false, no", () => {
    vi.stubEnv("STUDIO_ENABLED", "0");
    expect(isStudioEnabled()).toBe(false);
    vi.stubEnv("STUDIO_ENABLED", "false");
    expect(isStudioEnabled()).toBe(false);
    vi.stubEnv("STUDIO_ENABLED", "NO");
    expect(isStudioEnabled()).toBe(false);
  });

  it("studioDisabledJsonResponse returns 503 JSON", async () => {
    const res = studioDisabledJsonResponse();
    expect(res.status).toBe(503);
    const j = (await res.json()) as { code?: string };
    expect(j.code).toBe("STUDIO_DISABLED");
  });
});
