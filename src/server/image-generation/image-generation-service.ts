import { randomUUID } from "node:crypto";
import { prisma } from "@/server/db";
import { err, ok, type ServiceResult } from "@/server/result";
import { getPrivateStorage } from "@/server/storage/private-storage";
import { authorizeProjectAssociation } from "./image-generation-authorization";
import {
  createGenerationSchema,
  promptSummary,
  sanitizePrompt,
} from "./image-generation-schema";
import { reserveGenerationSlot } from "./image-generation-rate-limit";
import {
  findOwnedGeneration,
  listOwnedGenerations,
  toGenerationDto,
  type GenerationDto,
} from "./image-generation-repository";
import { validateGeneratedImageBytes } from "./image-validation";
import { getImageGenerationProvider } from "./provider-factory";
import { ImageGenerationUnavailableError } from "./provider-disabled";
import {
  isActiveStatus,
  isTerminalStatus,
  type ImageGenerationError,
  type ProviderGeneration,
} from "./image-generation-types";
import { recordSecurityEvent } from "@/server/auth/security-events";

async function audit(
  userId: string,
  kind: string,
  meta?: Record<string, string | number | null | undefined>,
) {
  await recordSecurityEvent({
    userId,
    kind,
    meta: meta ? JSON.stringify(meta) : null,
  });
}

function validateImageBytes(
  bytes: Uint8Array,
  mimeType: string,
): ServiceResult<{ mimeType: string }, "storage_failed"> {
  const checked = validateGeneratedImageBytes(bytes, mimeType);
  if (!checked.ok) {
    return err("storage_failed", checked.message);
  }
  return ok({ mimeType: checked.mimeType });
}

async function storeReadyOutput(
  userId: string,
  generationId: string,
  projectId: string | null,
  providerResult: ProviderGeneration,
): Promise<ServiceResult<{ uploadId: string }, "storage_failed">> {
  if (!providerResult.imageBytes || !providerResult.mimeType) {
    return err("storage_failed", "Provider returned no image bytes.");
  }
  const checked = validateImageBytes(
    providerResult.imageBytes,
    providerResult.mimeType,
  );
  if (!checked.ok) return checked;

  const filename = `generation-${generationId.slice(-8)}.png`.replace(
    /\.png$/,
    checked.value.mimeType === "image/jpeg"
      ? ".jpg"
      : checked.value.mimeType === "image/webp"
        ? ".webp"
        : ".png",
  );
  const storageKey = `${userId}/generated/${randomUUID()}-${filename}`;
  try {
    await getPrivateStorage().putObject({
      key: storageKey,
      bytes: providerResult.imageBytes,
      mimeType: checked.value.mimeType,
    });
  } catch {
    return err("storage_failed", "Could not store generated image.");
  }

  const upload = await prisma.upload.create({
    data: {
      userId,
      projectId,
      filename,
      mimeType: checked.value.mimeType,
      sizeBytes: providerResult.imageBytes.byteLength,
      status: "ready",
      source: "generated_image",
      storageKey,
    },
  });

  await prisma.imageGeneration.update({
    where: { id: generationId },
    data: {
      status: "ready",
      outputUploadId: upload.id,
      completedAt: new Date(),
      errorCode: null,
      errorMessage: null,
    },
  });

  return ok({ uploadId: upload.id });
}

async function applyProviderResult(
  userId: string,
  generationId: string,
  projectId: string | null,
  providerResult: ProviderGeneration,
): Promise<ServiceResult<GenerationDto, ImageGenerationError>> {
  if (providerResult.status === "ready") {
    const stored = await storeReadyOutput(
      userId,
      generationId,
      projectId,
      providerResult,
    );
    if (!stored.ok) {
      await prisma.imageGeneration.update({
        where: { id: generationId },
        data: {
          status: "failed",
          errorCode: "storage_failed",
          errorMessage: stored.message ?? "Storage failed.",
          completedAt: new Date(),
        },
      });
      await audit(userId, "generation_failed", { generationId });
      return err("storage_failed", stored.message);
    }
    await audit(userId, "generation_ready", { generationId });
  } else if (providerResult.status === "failed") {
    await prisma.imageGeneration.update({
      where: { id: generationId },
      data: {
        status: "failed",
        providerJobId: providerResult.providerJobId,
        errorCode: providerResult.errorCode ?? "provider_failed",
        errorMessage:
          providerResult.errorMessage ??
          "The image provider could not complete this request.",
        completedAt: new Date(),
      },
    });
    await audit(userId, "generation_failed", { generationId });
  } else if (providerResult.status === "canceled") {
    await prisma.imageGeneration.update({
      where: { id: generationId },
      data: {
        status: "canceled",
        canceledAt: new Date(),
        completedAt: new Date(),
      },
    });
    await audit(userId, "generation_canceled", { generationId });
  } else {
    await prisma.imageGeneration.update({
      where: { id: generationId },
      data: {
        status: providerResult.status,
        providerJobId: providerResult.providerJobId,
        ...(providerResult.status === "generating"
          ? { startedAt: new Date() }
          : {}),
      },
    });
  }

  const row = await findOwnedGeneration(userId, generationId);
  if (!row) return err("not_found", "Generation not found.");
  return ok(toGenerationDto(row));
}

export async function listImageGenerations(
  userId: string,
  cursor?: string | null,
) {
  return listOwnedGenerations(userId, cursor != null ? { cursor } : {});
}

export async function getImageGeneration(
  userId: string,
  generationId: string,
): Promise<ServiceResult<GenerationDto, "not_found">> {
  const row = await findOwnedGeneration(userId, generationId);
  if (!row) return err("not_found", "Generation not found.");
  return ok(toGenerationDto(row));
}

export async function createImageGeneration(
  userId: string,
  input: unknown,
): Promise<ServiceResult<GenerationDto, ImageGenerationError>> {
  const parsed = createGenerationSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "prompt");
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    const code: ImageGenerationError =
      "size" in fieldErrors ? "invalid_size" : "invalid_prompt";
    return err(code, "Check the highlighted fields.", fieldErrors);
  }

  const projectAuth = await authorizeProjectAssociation(
    userId,
    parsed.data.projectId,
  );
  if (!projectAuth.ok) {
    return err("forbidden", projectAuth.message);
  }

  const { name, provider } = getImageGenerationProvider();
  const prompt = sanitizePrompt(parsed.data.prompt);
  const negativePrompt = parsed.data.negativePrompt
    ? sanitizePrompt(parsed.data.negativePrompt)
    : null;

  const reserved = await reserveGenerationSlot({
    userId,
    projectId: projectAuth.value.projectId,
    prompt,
    negativePrompt,
    provider: name,
    width: parsed.data.width,
    height: parsed.data.height,
  });
  if (!reserved.ok) {
    return err(reserved.error, reserved.message);
  }
  const generation = { id: reserved.value.id };

  await audit(userId, "generation_created", {
    generationId: generation.id,
    provider: name,
  });

  let providerResult: ProviderGeneration;
  try {
    providerResult = await provider.create({
      prompt,
      ...(negativePrompt ? { negativePrompt } : {}),
      width: parsed.data.width,
      height: parsed.data.height,
    });
  } catch (error) {
    if (error instanceof ImageGenerationUnavailableError) {
      await prisma.imageGeneration.update({
        where: { id: generation.id },
        data: {
          status: "failed",
          errorCode: "provider_unavailable",
          errorMessage: "Image generation is not configured.",
          completedAt: new Date(),
        },
      });
      await audit(userId, "generation_failed", {
        generationId: generation.id,
      });
      return err(
        "provider_unavailable",
        "Image generation is not configured for this environment.",
      );
    }
    await prisma.imageGeneration.update({
      where: { id: generation.id },
      data: {
        status: "failed",
        errorCode: "provider_failed",
        errorMessage: "The image provider could not complete this request.",
        completedAt: new Date(),
      },
    });
    await audit(userId, "generation_failed", { generationId: generation.id });
    return err(
      "provider_failed",
      "The image provider could not complete this request.",
    );
  }

  await prisma.imageGeneration.update({
    where: { id: generation.id },
    data: {
      providerJobId: providerResult.providerJobId,
      startedAt: new Date(),
    },
  });

  return applyProviderResult(
    userId,
    generation.id,
    projectAuth.value.projectId,
    providerResult,
  );
}

export async function refreshImageGeneration(
  userId: string,
  generationId: string,
): Promise<ServiceResult<GenerationDto, ImageGenerationError>> {
  const row = await findOwnedGeneration(userId, generationId);
  if (!row) return err("not_found", "Generation not found.");
  if (isTerminalStatus(row.status)) {
    return ok(toGenerationDto(row));
  }
  if (!row.providerJobId) {
    return err("provider_failed", "Missing provider job.");
  }

  const { provider } = getImageGenerationProvider();
  let providerResult: ProviderGeneration;
  try {
    providerResult = await provider.getStatus(row.providerJobId);
  } catch (error) {
    if (error instanceof ImageGenerationUnavailableError) {
      return err("provider_unavailable", "Image generation is not configured.");
    }
    return err(
      "provider_failed",
      "The image provider could not complete this request.",
    );
  }

  const latest = await findOwnedGeneration(userId, generationId);
  if (!latest) return err("not_found", "Generation not found.");
  if (isTerminalStatus(latest.status)) {
    return ok(toGenerationDto(latest));
  }

  return applyProviderResult(
    userId,
    generationId,
    latest.projectId,
    providerResult,
  );
}

export async function cancelImageGeneration(
  userId: string,
  generationId: string,
): Promise<ServiceResult<GenerationDto, ImageGenerationError>> {
  const row = await findOwnedGeneration(userId, generationId);
  if (!row) return err("not_found", "Generation not found.");
  if (!isActiveStatus(row.status)) {
    return err("not_cancelable", "This generation can no longer be canceled.");
  }

  const { provider } = getImageGenerationProvider();
  if (row.providerJobId && provider.cancel) {
    try {
      await provider.cancel(row.providerJobId);
    } catch {
      // Local cancel still applies.
    }
  }

  await prisma.imageGeneration.update({
    where: { id: generationId },
    data: {
      status: "canceled",
      canceledAt: new Date(),
      completedAt: new Date(),
    },
  });
  await audit(userId, "generation_canceled", { generationId });
  const updated = await findOwnedGeneration(userId, generationId);
  if (!updated) return err("not_found", "Generation not found.");
  return ok(toGenerationDto(updated));
}

export async function retryImageGeneration(
  userId: string,
  generationId: string,
): Promise<ServiceResult<GenerationDto, ImageGenerationError>> {
  const row = await findOwnedGeneration(userId, generationId);
  if (!row) return err("not_found", "Generation not found.");
  if (row.status !== "failed" && row.status !== "canceled") {
    return err(
      "already_complete",
      "Only failed or canceled generations can be retried.",
    );
  }
  return createImageGeneration(userId, {
    prompt: row.prompt,
    negativePrompt: row.negativePrompt,
    width: row.width,
    height: row.height,
    projectId: row.projectId,
  });
}

export async function deleteImageGeneration(
  userId: string,
  generationId: string,
): Promise<ServiceResult<{ deleted: true }, ImageGenerationError>> {
  const row = await findOwnedGeneration(userId, generationId);
  if (!row) return err("not_found", "Generation not found.");

  await prisma.$transaction(async (tx) => {
    await tx.inspirationItem.deleteMany({
      where: { userId, imageGenerationId: generationId },
    });
    await tx.imageGeneration.delete({ where: { id: generationId } });
    if (row.outputUploadId) {
      await tx.inspirationItem.deleteMany({
        where: { userId, uploadId: row.outputUploadId },
      });
      await tx.upload
        .delete({ where: { id: row.outputUploadId } })
        .catch(() => null);
    }
  });

  if (row.outputUpload?.storageKey) {
    await getPrivateStorage().deleteObject(row.outputUpload.storageKey);
  }

  await audit(userId, "generation_deleted", {
    generationId,
    summary: promptSummary(row.prompt, 40),
  });
  return ok({ deleted: true });
}
