import type { ImageGenerationProvider } from "./image-generation-types";

export class ImageGenerationUnavailableError extends Error {
  readonly code = "image_generation_unavailable" as const;

  constructor(message = "Image generation is not configured.") {
    super(message);
    this.name = "ImageGenerationUnavailableError";
  }
}

export function createDisabledProvider(): ImageGenerationProvider {
  return {
    async create() {
      throw new ImageGenerationUnavailableError();
    },
    async getStatus() {
      throw new ImageGenerationUnavailableError();
    },
  };
}
