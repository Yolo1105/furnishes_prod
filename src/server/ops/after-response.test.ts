import { describe, expect, it, vi } from "vitest";
import { runAfterResponse } from "./after-response";

describe("runAfterResponse", () => {
  it("invokes the task (fallback when after() is unavailable in tests)", async () => {
    const task = vi.fn(async () => undefined);
    runAfterResponse(task);
    await vi.waitFor(() => {
      expect(task).toHaveBeenCalledOnce();
    });
  });
});
