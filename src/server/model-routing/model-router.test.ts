import { afterEach, describe, expect, it } from "vitest";
import { resolveModel } from "./model-router";

const ENV_KEYS = [
  "AI_MODEL_NANO",
  "AI_MODEL_MINI",
  "AI_MODEL_REASONING",
  "CHAT_MODEL_PRIMARY",
  "CHAT_VISION_MODEL",
  "IMAGE_GENERATION_MODEL",
] as const;

function clearModelEnv(): void {
  for (const key of ENV_KEYS) {
    delete process.env[key];
  }
}

describe("resolveModel", () => {
  afterEach(() => {
    clearModelEnv();
  });

  it("falls back to gpt-4o-mini when no env is set", () => {
    expect(resolveModel("structured")).toBe("gpt-4o-mini");
    expect(resolveModel("chat")).toBe("gpt-4o-mini");
    expect(resolveModel("classification")).toBe("gpt-4o-mini");
  });

  it("prefers NANO then MINI for classification and judge", () => {
    process.env.AI_MODEL_NANO = "gpt-nano";
    process.env.AI_MODEL_MINI = "gpt-mini";
    process.env.CHAT_MODEL_PRIMARY = "gpt-chat";
    expect(resolveModel("classification")).toBe("gpt-nano");
    expect(resolveModel("judge")).toBe("gpt-nano");

    delete process.env.AI_MODEL_NANO;
    expect(resolveModel("classification")).toBe("gpt-mini");
  });

  it("prefers MINI for structured, brief, and extraction", () => {
    process.env.AI_MODEL_MINI = "gpt-mini";
    process.env.CHAT_MODEL_PRIMARY = "gpt-chat";
    expect(resolveModel("structured")).toBe("gpt-mini");
    expect(resolveModel("brief")).toBe("gpt-mini");
    expect(resolveModel("extraction")).toBe("gpt-mini");
  });

  it("uses REASONING for chat when set, otherwise MINI", () => {
    process.env.AI_MODEL_REASONING = "gpt-reason";
    process.env.AI_MODEL_MINI = "gpt-mini";
    expect(resolveModel("chat")).toBe("gpt-reason");

    delete process.env.AI_MODEL_REASONING;
    expect(resolveModel("chat")).toBe("gpt-mini");
  });

  it("uses CHAT_VISION_MODEL then MINI for vision", () => {
    process.env.CHAT_VISION_MODEL = "gpt-vision";
    process.env.AI_MODEL_MINI = "gpt-mini";
    expect(resolveModel("vision")).toBe("gpt-vision");

    delete process.env.CHAT_VISION_MODEL;
    expect(resolveModel("vision")).toBe("gpt-mini");
  });

  it("uses IMAGE_GENERATION_MODEL then MINI for image", () => {
    process.env.IMAGE_GENERATION_MODEL = "gpt-image";
    process.env.AI_MODEL_MINI = "gpt-mini";
    expect(resolveModel("image")).toBe("gpt-image");

    delete process.env.IMAGE_GENERATION_MODEL;
    expect(resolveModel("image")).toBe("gpt-mini");
  });

  it("falls through to CHAT_MODEL_PRIMARY before the hard default", () => {
    process.env.CHAT_MODEL_PRIMARY = "gpt-primary";
    expect(resolveModel("structured")).toBe("gpt-primary");
    expect(resolveModel("classification")).toBe("gpt-primary");
  });

  it("treats empty tier env vars as disabled", () => {
    process.env.AI_MODEL_MINI = "   ";
    process.env.CHAT_MODEL_PRIMARY = "gpt-primary";
    expect(resolveModel("structured")).toBe("gpt-primary");
  });
});
