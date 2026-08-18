import {
  createDisabledProvider,
  ImageGenerationUnavailableError,
} from "./provider-disabled";
import { createHttpProvider } from "./provider-http";
import { createTestProvider } from "./provider-test";
import type { ImageGenerationProvider } from "./image-generation-types";

type ImageGenerationProviderName = "disabled" | "test" | "http";

function resolveImageGenerationProviderName(
  raw = process.env.IMAGE_GENERATION_PROVIDER,
): ImageGenerationProviderName {
  const value = (raw ?? "disabled").trim().toLowerCase();
  if (value === "test" || value === "http" || value === "disabled") {
    return value;
  }
  return "disabled";
}

function assertImageGenerationEnv(): void {
  const name = resolveImageGenerationProviderName();
  const isTestRuntime =
    process.env.NEXT_PUBLIC_E2E === "1" || process.env.NODE_ENV === "test";

  if (name === "test" && !isTestRuntime) {
    throw new Error(
      "IMAGE_GENERATION_PROVIDER=test is only allowed when NEXT_PUBLIC_E2E=1 or NODE_ENV=test.",
    );
  }

  if (name === "http") {
    const missing = [
      "IMAGE_GENERATION_API_URL",
      "IMAGE_GENERATION_API_KEY",
      "IMAGE_GENERATION_MODEL",
    ].filter((key) => !process.env[key]?.trim());
    if (missing.length > 0 && process.env.NODE_ENV === "production") {
      throw new Error(
        `HTTP image generation is missing: ${missing.join(", ")}.`,
      );
    }
  }
}

export function getImageGenerationProvider(): {
  name: ImageGenerationProviderName;
  provider: ImageGenerationProvider;
} {
  assertImageGenerationEnv();
  const name = resolveImageGenerationProviderName();
  if (name === "test") {
    return { name, provider: createTestProvider() };
  }
  if (name === "http") {
    try {
      return { name, provider: createHttpProvider() };
    } catch (error) {
      if (error instanceof ImageGenerationUnavailableError) {
        return { name: "disabled", provider: createDisabledProvider() };
      }
      throw error;
    }
  }
  return { name: "disabled", provider: createDisabledProvider() };
}
