import { z } from "zod";
import { envMs } from "@/server/env";
import type {
  CreateGenerationInput,
  ImageGenerationProvider,
  ProviderGeneration,
} from "./image-generation-types";
import { ImageGenerationUnavailableError } from "./provider-disabled";

const createResponseSchema = z.object({
  jobId: z.string().min(1),
  status: z.enum(["queued", "generating", "ready", "failed", "canceled"]),
  imageUrl: z.string().url().optional(),
  errorCode: z.string().optional(),
  errorMessage: z.string().optional(),
});

const statusResponseSchema = createResponseSchema;

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

function timeoutMs(): number {
  return envMs("IMAGE_GENERATION_REQUEST_TIMEOUT_MS", 120_000);
}

async function fetchJson(url: string, init: RequestInit): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs());
  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        accept: "application/json",
        authorization: `Bearer ${process.env.IMAGE_GENERATION_API_KEY}`,
        "content-type": "application/json",
        ...init.headers,
      },
    });
    if (!response.ok) {
      throw new Error(`Provider HTTP ${response.status}`);
    }
    return response.json();
  } finally {
    clearTimeout(timer);
  }
}

async function fetchImageBytes(url: string): Promise<{
  bytes: Uint8Array;
  mimeType: string;
}> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs());
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        authorization: `Bearer ${process.env.IMAGE_GENERATION_API_KEY}`,
      },
    });
    if (!response.ok) {
      throw new Error("Could not download generated image.");
    }
    const mimeType = response.headers.get("content-type") ?? "image/png";
    if (!mimeType.startsWith("image/")) {
      throw new Error("Provider returned a non-image payload.");
    }
    const buffer = new Uint8Array(await response.arrayBuffer());
    if (buffer.byteLength === 0 || buffer.byteLength > MAX_IMAGE_BYTES) {
      throw new Error("Generated image size is invalid.");
    }
    return { bytes: buffer, mimeType: mimeType.split(";")[0]!.trim() };
  } finally {
    clearTimeout(timer);
  }
}

function mapProviderPayload(
  payload: z.infer<typeof createResponseSchema>,
  image?: { bytes: Uint8Array; mimeType: string },
): ProviderGeneration {
  return {
    providerJobId: payload.jobId,
    status: payload.status,
    ...(image ? { imageBytes: image.bytes, mimeType: image.mimeType } : {}),
    ...(payload.errorCode ? { errorCode: payload.errorCode } : {}),
    ...(payload.errorMessage
      ? { errorMessage: "The image provider could not complete this request." }
      : {}),
  };
}

export function createHttpProvider(): ImageGenerationProvider {
  const baseUrl = process.env.IMAGE_GENERATION_API_URL?.replace(/\/$/, "");
  const apiKey = process.env.IMAGE_GENERATION_API_KEY;
  const model = process.env.IMAGE_GENERATION_MODEL;

  if (!baseUrl || !apiKey || !model) {
    throw new ImageGenerationUnavailableError(
      "HTTP image generation requires URL, key, and model.",
    );
  }

  return {
    async create(input: CreateGenerationInput): Promise<ProviderGeneration> {
      try {
        const raw = await fetchJson(`${baseUrl}/generations`, {
          method: "POST",
          body: JSON.stringify({
            model,
            prompt: input.prompt,
            negative_prompt: input.negativePrompt,
            width: input.width,
            height: input.height,
          }),
        });
        const parsed = createResponseSchema.parse(raw);
        if (parsed.status === "ready" && parsed.imageUrl) {
          const image = await fetchImageBytes(parsed.imageUrl);
          return mapProviderPayload(parsed, image);
        }
        return mapProviderPayload(parsed);
      } catch {
        throw new Error("provider_failed");
      }
    },

    async getStatus(providerJobId: string): Promise<ProviderGeneration> {
      try {
        const raw = await fetchJson(
          `${baseUrl}/generations/${encodeURIComponent(providerJobId)}`,
          { method: "GET" },
        );
        const parsed = statusResponseSchema.parse(raw);
        if (parsed.status === "ready" && parsed.imageUrl) {
          const image = await fetchImageBytes(parsed.imageUrl);
          return mapProviderPayload(parsed, image);
        }
        return mapProviderPayload(parsed);
      } catch {
        return {
          providerJobId,
          status: "failed",
          errorCode: "provider_failed",
          errorMessage: "The image provider could not complete this request.",
        };
      }
    },

    async cancel(providerJobId: string): Promise<void> {
      try {
        await fetchJson(
          `${baseUrl}/generations/${encodeURIComponent(providerJobId)}/cancel`,
          { method: "POST", body: "{}" },
        );
      } catch {
        // Cancellation is best-effort for HTTP adapters.
      }
    },
  };
}
