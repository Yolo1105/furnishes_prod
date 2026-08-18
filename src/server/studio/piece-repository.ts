import type {
  FurnitureStudioPiece,
  ImageGeneration,
  Upload,
} from "@prisma/client";
import { prisma } from "@/server/db";

export type StudioPieceQuality = {
  image?: string;
  model?: string;
};

type PieceWithRelations = FurnitureStudioPiece & {
  outputUpload: Pick<Upload, "id" | "filename" | "mimeType"> | null;
  imageGeneration: Pick<
    ImageGeneration,
    "id" | "provider" | "width" | "height"
  > | null;
};

const include = {
  outputUpload: { select: { id: true, filename: true, mimeType: true } },
  imageGeneration: {
    select: { id: true, provider: true, width: true, height: true },
  },
} as const;

export function toPieceDto(row: PieceWithRelations) {
  const quality = row.quality as StudioPieceQuality;
  return {
    id: row.id,
    title: row.title,
    prompt: row.prompt,
    quality,
    status: row.status,
    imageGenerationId: row.imageGenerationId,
    sourcePieceId: row.sourcePieceId,
    outputUploadId: row.outputUploadId,
    outputFilename: row.outputUpload?.filename ?? null,
    outputMimeType: row.outputUpload?.mimeType ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export type StudioPieceDto = ReturnType<typeof toPieceDto>;

export async function findOwnedStudioPiece(
  userId: string,
  pieceId: string,
): Promise<PieceWithRelations | null> {
  return prisma.furnitureStudioPiece.findFirst({
    where: { id: pieceId, userId },
    include,
  });
}

export async function listOwnedStudioPieces(
  userId: string,
  options: { cursor?: string | null; take?: number } = {},
) {
  const take = Math.min(Math.max(options.take ?? 20, 1), 50);
  const rows = await prisma.furnitureStudioPiece.findMany({
    where: { userId },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: take + 1,
    ...(options.cursor ? { cursor: { id: options.cursor }, skip: 1 } : {}),
    include,
  });
  const hasMore = rows.length > take;
  const items = hasMore ? rows.slice(0, take) : rows;
  return {
    items: items.map(toPieceDto),
    nextCursor: hasMore ? items[items.length - 1]!.id : null,
  };
}

export async function findStudioPieceByGenerationId(
  imageGenerationId: string,
): Promise<FurnitureStudioPiece | null> {
  return prisma.furnitureStudioPiece.findUnique({
    where: { imageGenerationId },
  });
}

export async function createStudioPiece(data: {
  userId: string;
  prompt: string;
  title: string;
  quality: StudioPieceQuality;
  status?: string;
  imageGenerationId?: string | null;
  sourcePieceId?: string | null;
  outputUploadId?: string | null;
}) {
  return prisma.furnitureStudioPiece.create({
    data: {
      userId: data.userId,
      prompt: data.prompt,
      title: data.title,
      quality: data.quality,
      status: data.status ?? "completed",
      imageGenerationId: data.imageGenerationId ?? null,
      sourcePieceId: data.sourcePieceId ?? null,
      outputUploadId: data.outputUploadId ?? null,
    },
    include,
  });
}

export async function updateStudioPieceTitle(
  userId: string,
  pieceId: string,
  title: string,
) {
  const existing = await prisma.furnitureStudioPiece.findFirst({
    where: { id: pieceId, userId },
  });
  if (!existing) return null;
  return prisma.furnitureStudioPiece.update({
    where: { id: pieceId },
    data: { title },
    include,
  });
}

export async function deleteOwnedStudioPiece(userId: string, pieceId: string) {
  const existing = await prisma.furnitureStudioPiece.findFirst({
    where: { id: pieceId, userId },
  });
  if (!existing) return null;
  await prisma.furnitureStudioPiece.delete({ where: { id: pieceId } });
  return existing;
}
