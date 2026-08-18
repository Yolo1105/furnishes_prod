import { describe, expect, it } from "vitest";
import { getPrivateStorage } from "./private-storage";

describe("private storage local provider", () => {
  it("round-trips put/get/delete under .data/uploads", async () => {
    process.env.STORAGE_PROVIDER = "local";
    const storage = getPrivateStorage();
    const key = `test/${Date.now()}-${Math.random().toString(16).slice(2)}.bin`;
    const bytes = new Uint8Array([1, 2, 3, 9]);
    await storage.putObject({
      key,
      bytes,
      mimeType: "application/octet-stream",
    });
    const loaded = await storage.getObject(key);
    expect(Array.from(loaded.bytes)).toEqual([1, 2, 3, 9]);
    await storage.deleteObject(key);
  });
});
