import { prisma } from "@/server/db";
import { recordSecurityEvent } from "@/server/auth/security-events";
import { createImageGeneration } from "@/server/image-generation/image-generation-service";
import { authorizeProjectAssociation } from "@/server/image-generation/image-generation-authorization";
import { err, ok, type ServiceResult } from "@/server/result";
import {
  createStudioPieceSchema,
  patchStudioPieceSchema,
  TITLE_MAX,
} from "./piece-schema";
import {
  createStudioPiece,
  deleteOwnedStudioPiece,
  findOwnedStudioPiece,
  findStudioPieceByGenerationId,
  listOwnedStudioPieces,
  toPieceDto,
  updateStudioPieceTitle,
  type StudioPieceDto,
  type StudioPieceQuality,
} from "./piece-repository";
import { isStudioEnabled } from "./studio-enabled";

type StudioPieceError = "disabled" | "not_found" | "validation" | "forbidden";

async function audit(
  userId: string,
  kind: string,
  meta?: Record<string, string | null | undefined>,
) {
  await recordSecurityEvent({
    userId,
    kind,
    meta: meta ? JSON.stringify(meta) : null,
  });
}

function disabledResult<T>(): ServiceResult<T, "disabled"> {
  return err("disabled", "Studio is not enabled.");
}

function generationQuality(generation: {
  provider: string;
  width: number;
  height: number;
}): StudioPieceQuality {
  return {
    model: generation.provider,
    image: `${generation.width}x${generation.height}`,
  };
}

function defaultTitle(prompt: string, title?: string): string {
  const trimmed = title?.trim();
  if (trimmed) return trimmed.slice(0, TITLE_MAX);
  return prompt.trim().slice(0, TITLE_MAX) || "Untitled piece";
}

async function validateSourcePiece(
  userId: string,
  sourcePieceId: string | undefined,
): Promise<ServiceResult<{ sourcePieceId: string | null }, StudioPieceError>> {
  if (!sourcePieceId) return ok({ sourcePieceId: null });
  const source = await findOwnedStudioPiece(userId, sourcePieceId);
  if (!source) {
    return err("not_found", "Source studio piece not found.");
  }
  return ok({ sourcePieceId });
}

async function validateReadyGeneration(
  userId: string,
  imageGenerationId: string,
): Promise<
  ServiceResult<
    {
      id: string;
      prompt: string;
      outputUploadId: string;
      provider: string;
      width: number;
      height: number;
    },
    StudioPieceError
  >
> {
  const generation = await prisma.imageGeneration.findFirst({
    where: { id: imageGenerationId, userId },
  });
  if (!generation) {
    return err("not_found", "Generation not found.");
  }
  if (generation.status !== "ready" || !generation.outputUploadId) {
    return err(
      "validation",
      "Only ready generations with an output image can become studio pieces.",
    );
  }
  const existing = await findStudioPieceByGenerationId(imageGenerationId);
  if (existing) {
    return err(
      "validation",
      "This generation is already linked to a studio piece.",
    );
  }
  return ok({
    id: generation.id,
    prompt: generation.prompt,
    outputUploadId: generation.outputUploadId,
    provider: generation.provider,
    width: generation.width,
    height: generation.height,
  });
}

export async function listStudioPieces(
  userId: string,
  options: { cursor?: string | null } = {},
) {
  if (!isStudioEnabled()) {
    return disabledResult<never>();
  }
  return ok(await listOwnedStudioPieces(userId, options));
}

export async function getStudioPiece(
  userId: string,
  pieceId: string,
): Promise<ServiceResult<StudioPieceDto, StudioPieceError>> {
  if (!isStudioEnabled()) return disabledResult();
  const piece = await findOwnedStudioPiece(userId, pieceId);
  if (!piece) return err("not_found", "Studio piece not found.");
  return ok(toPieceDto(piece));
}

export async function createStudioPieceFromGeneration(input: {
  userId: string;
  imageGenerationId: string;
  title?: string;
  sourcePieceId?: string;
}): Promise<ServiceResult<StudioPieceDto, StudioPieceError>> {
  if (!isStudioEnabled()) return disabledResult();

  const source = await validateSourcePiece(input.userId, input.sourcePieceId);
  if (!source.ok) return source;

  const generation = await validateReadyGeneration(
    input.userId,
    input.imageGenerationId,
  );
  if (!generation.ok) return generation;

  const created = await createStudioPiece({
    userId: input.userId,
    prompt: generation.value.prompt,
    title: defaultTitle(generation.value.prompt, input.title),
    quality: generationQuality(generation.value),
    imageGenerationId: generation.value.id,
    sourcePieceId: source.value.sourcePieceId,
    outputUploadId: generation.value.outputUploadId,
  });

  await audit(input.userId, "studio_piece_created", {
    pieceId: created.id,
    imageGenerationId: generation.value.id,
  });
  return ok(toPieceDto(created));
}

async function createStudioPieceFromPrompt(input: {
  userId: string;
  prompt: string;
  projectId?: string;
  title?: string;
  sourcePieceId?: string;
}): Promise<ServiceResult<StudioPieceDto, StudioPieceError>> {
  if (!isStudioEnabled()) return disabledResult();

  const source = await validateSourcePiece(input.userId, input.sourcePieceId);
  if (!source.ok) return source;

  const projectAuth = await authorizeProjectAssociation(
    input.userId,
    input.projectId,
  );
  if (!projectAuth.ok) {
    return err("forbidden", projectAuth.message);
  }

  const generated = await createImageGeneration(input.userId, {
    prompt: input.prompt,
    width: 1024,
    height: 1024,
    ...(input.projectId !== undefined ? { projectId: input.projectId } : {}),
  });
  if (!generated.ok) {
    return err(
      "validation",
      generated.message ?? "Could not start image generation.",
    );
  }
  if (generated.value.status !== "ready" || !generated.value.outputUploadId) {
    return err(
      "validation",
      "Generation is not ready yet. Retry with imageGenerationId when ready.",
    );
  }

  const existing = await findStudioPieceByGenerationId(generated.value.id);
  if (existing) {
    return err(
      "validation",
      "This generation is already linked to a studio piece.",
    );
  }

  const created = await createStudioPiece({
    userId: input.userId,
    prompt: input.prompt,
    title: defaultTitle(input.prompt, input.title),
    quality: {
      model: generated.value.provider,
      image: `${generated.value.width}x${generated.value.height}`,
    },
    imageGenerationId: generated.value.id,
    sourcePieceId: source.value.sourcePieceId,
    outputUploadId: generated.value.outputUploadId,
  });

  await audit(input.userId, "studio_piece_created", {
    pieceId: created.id,
    imageGenerationId: generated.value.id,
  });
  return ok(toPieceDto(created));
}

export async function createStudioPieceFromInput(
  userId: string,
  body: unknown,
): Promise<ServiceResult<StudioPieceDto, StudioPieceError>> {
  const parsed = createStudioPieceSchema.safeParse(body);
  if (!parsed.success) {
    return err("validation", "Provide either imageGenerationId or prompt.");
  }

  if (parsed.data.imageGenerationId) {
    return createStudioPieceFromGeneration({
      userId,
      imageGenerationId: parsed.data.imageGenerationId,
      ...(parsed.data.title !== undefined ? { title: parsed.data.title } : {}),
      ...(parsed.data.sourcePieceId !== undefined
        ? { sourcePieceId: parsed.data.sourcePieceId }
        : {}),
    });
  }

  return createStudioPieceFromPrompt({
    userId,
    prompt: parsed.data.prompt!,
    ...(parsed.data.projectId !== undefined
      ? { projectId: parsed.data.projectId }
      : {}),
    ...(parsed.data.title !== undefined ? { title: parsed.data.title } : {}),
    ...(parsed.data.sourcePieceId !== undefined
      ? { sourcePieceId: parsed.data.sourcePieceId }
      : {}),
  });
}

export async function updateStudioPiece(
  userId: string,
  pieceId: string,
  body: unknown,
): Promise<ServiceResult<StudioPieceDto, StudioPieceError>> {
  if (!isStudioEnabled()) return disabledResult();

  const existing = await findOwnedStudioPiece(userId, pieceId);
  if (!existing) return err("not_found", "Studio piece not found.");

  const parsed = patchStudioPieceSchema.safeParse(body);
  if (!parsed.success) {
    return err(
      "validation",
      "Title is required and must be 200 characters or fewer.",
    );
  }

  const updated = await updateStudioPieceTitle(
    userId,
    pieceId,
    parsed.data.title,
  );
  if (!updated) return err("not_found", "Studio piece not found.");
  return ok(toPieceDto(updated));
}

export async function deleteStudioPiece(
  userId: string,
  pieceId: string,
): Promise<ServiceResult<{ deleted: true }, StudioPieceError>> {
  if (!isStudioEnabled()) return disabledResult();

  const deleted = await deleteOwnedStudioPiece(userId, pieceId);
  if (!deleted) return err("not_found", "Studio piece not found.");

  await audit(userId, "studio_piece_deleted", { pieceId });
  return ok({ deleted: true });
}
