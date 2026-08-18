type GenerationProviderStatus =
  "queued" | "generating" | "ready" | "failed" | "canceled";

export type CreateGenerationInput = {
  prompt: string;
  negativePrompt?: string;
  width: number;
  height: number;
};

export type ProviderGeneration = {
  providerJobId: string;
  status: GenerationProviderStatus;
  imageBytes?: Uint8Array;
  mimeType?: string;
  errorCode?: string;
  errorMessage?: string;
};

export interface ImageGenerationProvider {
  create(input: CreateGenerationInput): Promise<ProviderGeneration>;
  getStatus(providerJobId: string): Promise<ProviderGeneration>;
  cancel?(providerJobId: string): Promise<void>;
}

export type ImageGenerationError =
  | "invalid_prompt"
  | "invalid_size"
  | "provider_unavailable"
  | "rate_limited"
  | "concurrency_limit"
  | "not_found"
  | "forbidden"
  | "already_complete"
  | "not_cancelable"
  | "provider_failed"
  | "storage_failed"
  | "validation";

export function isTerminalStatus(status: string): boolean {
  return status === "ready" || status === "failed" || status === "canceled";
}

export function isActiveStatus(status: string): boolean {
  return status === "queued" || status === "generating";
}
