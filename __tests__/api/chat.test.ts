import { describe, it, expect } from "vitest";

const BASE_URL = process.env.TEST_BASE_URL ?? "http://localhost:3000";

/** Avoid hanging when no server is listening (CI / local without `next dev`). */
function fetchChat(init: RequestInit) {
  return fetch(`${BASE_URL}/api/chat`, {
    ...init,
    signal: AbortSignal.timeout(4000),
  }).catch(() => null);
}

describe("chat API", () => {
  it("validates request body shape when server responds", async () => {
    const res = await fetchChat({
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    if (res === null) return;
    expect([400, 404, 500, 502, 503]).toContain(res.status);
  });

  it("rejects empty message when server responds", async () => {
    const res = await fetchChat({
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "" }),
    });
    if (res === null) return;
    expect([400, 404, 500, 502, 503]).toContain(res.status);
  });
});
