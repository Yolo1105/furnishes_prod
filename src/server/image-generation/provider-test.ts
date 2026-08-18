import { createHash, randomUUID } from "node:crypto";
import type {
  CreateGenerationInput,
  ImageGenerationProvider,
  ProviderGeneration,
} from "./image-generation-types";

type JobRecord = {
  prompt: string;
  negativePrompt?: string;
  width: number;
  height: number;
  createdAt: number;
  canceled: boolean;
  mode: "ready" | "delayed" | "fail" | "cancel";
  refreshCount: number;
};

const jobs = new Map<string, JobRecord>();

/** Minimal valid 1×1 PNG (deterministic fixture for tests). */
export const TEST_PNG_BYTES = Uint8Array.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49,
  0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x02,
  0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xde, 0x00, 0x00, 0x00, 0x0c, 0x49, 0x44,
  0x41, 0x54, 0x08, 0xd7, 0x63, 0xf8, 0xcf, 0xc0, 0x00, 0x00, 0x00, 0x03, 0x00,
  0x01, 0x00, 0x05, 0xfe, 0xd4, 0xef, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e,
  0x44, 0xae, 0x42, 0x60, 0x82,
]);

function modeFromPrompt(prompt: string): JobRecord["mode"] {
  const lower = prompt.toLowerCase();
  if (lower.includes("test-fail")) return "fail";
  if (lower.includes("test-cancel")) return "cancel";
  if (lower.includes("test-delayed")) return "delayed";
  return "ready";
}

function tintedPng(seed: string): Uint8Array {
  // Keep bytes identical across runs for a given seed length class.
  const digest = createHash("sha256").update(seed).digest();
  const bytes = new Uint8Array(TEST_PNG_BYTES);
  // Mutate a non-critical IDAT payload byte while keeping length; signature stays PNG.
  bytes[40] = digest[0] ?? 0x63;
  return bytes;
}

export function createTestProvider(): ImageGenerationProvider {
  return {
    async create(input: CreateGenerationInput): Promise<ProviderGeneration> {
      const id = `test-${randomUUID()}`;
      const mode = modeFromPrompt(input.prompt);
      jobs.set(id, {
        prompt: input.prompt,
        ...(input.negativePrompt
          ? { negativePrompt: input.negativePrompt }
          : {}),
        width: input.width,
        height: input.height,
        createdAt: Date.now(),
        canceled: false,
        mode,
        refreshCount: 0,
      });

      if (mode === "ready") {
        return {
          providerJobId: id,
          status: "ready",
          imageBytes: tintedPng(input.prompt),
          mimeType: "image/png",
        };
      }
      if (mode === "fail") {
        return {
          providerJobId: id,
          status: "failed",
          errorCode: "provider_failed",
          errorMessage: "Test provider failed on purpose.",
        };
      }
      return {
        providerJobId: id,
        status: mode === "cancel" ? "generating" : "queued",
      };
    },

    async getStatus(providerJobId: string): Promise<ProviderGeneration> {
      const job = jobs.get(providerJobId);
      if (!job) {
        return {
          providerJobId,
          status: "failed",
          errorCode: "not_found",
          errorMessage: "Unknown test job.",
        };
      }
      if (job.canceled) {
        return { providerJobId, status: "canceled" };
      }
      job.refreshCount += 1;
      if (job.mode === "fail") {
        return {
          providerJobId,
          status: "failed",
          errorCode: "provider_failed",
          errorMessage: "Test provider failed on purpose.",
        };
      }
      if (job.mode === "cancel") {
        return { providerJobId, status: "generating" };
      }
      if (job.mode === "delayed" && job.refreshCount < 2) {
        return { providerJobId, status: "generating" };
      }
      return {
        providerJobId,
        status: "ready",
        imageBytes: tintedPng(job.prompt),
        mimeType: "image/png",
      };
    },

    async cancel(providerJobId: string): Promise<void> {
      const job = jobs.get(providerJobId);
      if (job) job.canceled = true;
    },
  };
}

/** Test helper: clear in-memory jobs between unit tests. */
export function resetTestProviderJobs(): void {
  jobs.clear();
}
