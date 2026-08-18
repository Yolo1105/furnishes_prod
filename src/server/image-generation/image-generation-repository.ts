import type { ImageGeneration, Upload } from "@prisma/client";
import { prisma } from "@/server/db";

type GenerationWithOutput = ImageGeneration & {
  outputUpload: Upload | null;
  project: { id: string; name: string } | null;
};

export function toGenerationDto(row: GenerationWithOutput) {
  return {
    id: row.id,
    prompt: row.prompt,
    negativePrompt: row.negativePrompt,
    status: row.status,
    provider: row.provider,
    width: row.width,
    height: row.height,
    projectId: row.projectId,
    projectName: row.project?.name ?? null,
    outputUploadId: row.outputUploadId,
    outputFilename: row.outputUpload?.filename ?? null,
    outputMimeType: row.outputUpload?.mimeType ?? null,
    errorCode: row.errorCode,
    errorMessage: row.errorMessage,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    startedAt: row.startedAt?.toISOString() ?? null,
    completedAt: row.completedAt?.toISOString() ?? null,
    canceledAt: row.canceledAt?.toISOString() ?? null,
  };
}

export type GenerationDto = ReturnType<typeof toGenerationDto>;

const include = {
  outputUpload: true,
  project: { select: { id: true, name: true } },
} as const;

export async function findOwnedGeneration(
  userId: string,
  generationId: string,
): Promise<GenerationWithOutput | null> {
  return prisma.imageGeneration.findFirst({
    where: { id: generationId, userId },
    include,
  });
}

export async function listOwnedGenerations(
  userId: string,
  options: { cursor?: string | null; take?: number } = {},
) {
  const take = Math.min(Math.max(options.take ?? 20, 1), 50);
  const rows = await prisma.imageGeneration.findMany({
    where: { userId },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: take + 1,
    ...(options.cursor ? { cursor: { id: options.cursor }, skip: 1 } : {}),
    include,
  });
  const hasMore = rows.length > take;
  const items = hasMore ? rows.slice(0, take) : rows;
  return {
    items: items.map(toGenerationDto),
    nextCursor: hasMore ? items[items.length - 1]!.id : null,
  };
}
