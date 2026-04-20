/**
 * Provider abstraction for furniture text→image→mesh. Implementations: FalProvider.
 */

import type { GenerationQuality, MeshModelId } from "@/types/generation";

export type LlmCompleteParams = {
  system: string;
  user: string;
  model?: string;
  temperature?: number;
};

export type TextToImageParams = {
  prompt: string;
  size?: "square" | "square_hd";
  steps?: number;
  quality?: GenerationQuality;
};

export type ImageToMeshParams = {
  imageUrl: string;
  textured?: boolean;
  quality?: GenerationQuality;
  meshModel?: MeshModelId;
};

export type ImageResult = { url: string };
export type MeshResult = { url: string };

export interface LlmService {
  complete(params: LlmCompleteParams): Promise<string>;
}

export interface ImageService {
  textToImage(params: TextToImageParams): Promise<ImageResult>;
}

export interface MeshService {
  imageToMesh(params: ImageToMeshParams): Promise<MeshResult>;
}

export interface GenerationProvider
  extends LlmService, ImageService, MeshService {
  readonly name: string;
}

export class ProviderError extends Error {
  public readonly code: number;
  public readonly provider: string;
  public readonly stage: "llm" | "image" | "mesh" | "unknown";
  public readonly retryable: boolean;

  constructor(init: {
    message: string;
    code?: number;
    provider: string;
    stage?: "llm" | "image" | "mesh" | "unknown";
    retryable?: boolean;
    cause?: unknown;
  }) {
    super(init.message);
    this.name = "ProviderError";
    this.code = init.code ?? 0;
    this.provider = init.provider;
    this.stage = init.stage ?? "unknown";
    this.retryable = init.retryable ?? false;
    if (init.cause !== undefined) {
      (this as { cause?: unknown }).cause = init.cause;
    }
  }
}
