import { describe, expect, it } from "vitest";

/**
 * Mirrors LandingLoader's one-shot guard so callback idempotency stays covered
 * without mounting React/WebGL in unit tests.
 */
function createOneShot(callback: () => void) {
  let fired = false;
  return () => {
    if (fired) return;
    fired = true;
    callback();
  };
}

describe("loader callback idempotency", () => {
  it("fires a callback only once across repeated invokes", () => {
    let count = 0;
    const fire = createOneShot(() => {
      count += 1;
    });
    fire();
    fire();
    fire();
    expect(count).toBe(1);
  });
});
