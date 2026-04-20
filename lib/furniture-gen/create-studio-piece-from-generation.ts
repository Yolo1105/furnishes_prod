import "server-only";

import { prisma } from "@/lib/eva/db";
import { ingestProviderUrlToR2 } from "@/lib/storage/furniture-artifact-ingest";

export type StudioPieceQualityJson = {
  tier: string;
  imageQuality?: string;
  meshQuality?: string;
  meshModel?: string;
};

export function titleFromPrompt(prompt: string): string {
  const t = prompt.trim().slice(0, 120);
  return t.length > 0 ? t : "Untitled piece";
}

export async function assertSourcePieceOwned(
  userId: string,
  sourcePieceId: string | undefined,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!sourcePieceId) return { ok: true };
  const row = await prisma.furnitureStudioPiece.findFirst({
    where: { id: sourcePieceId, userId },
    select: { id: true },
  });
  if (!row) {
    return { ok: false, error: "Invalid source piece for lineage." };
  }
  return { ok: true };
}

/**
 * After a successful pipeline run: create `FurnitureStudioPiece`, copy assets to R2 when configured.
 */
export async function finalizeStudioPieceAfterGeneration(args: {
  userId: string;
  furnitureGenerationId: string;
  prompt: string;
  quality: StudioPieceQualityJson;
  providerImageUrl: string;
  providerGlbUrl: string;
  sourcePieceId: string | null;
}): Promise<
  | {
      ok: true;
      piece: {
        id: string;
        title: string;
        displayImageUrl: string;
        displayGlbUrl: string;
        sourcePieceId: string | null;
      };
    }
  | { ok: false; error: string }
> {
  const title = titleFromPrompt(args.prompt);

  const piece = await prisma.furnitureStudioPiece.create({
    data: {
      userId: args.userId,
      prompt: args.prompt,
      title,
      quality: args.quality as object,
      status: "completed",
      providerImageUrl: args.providerImageUrl,
      providerGlbUrl: args.providerGlbUrl,
      sourcePieceId: args.sourcePieceId,
      furnitureGenerationId: args.furnitureGenerationId,
    },
  });

  let storedImageUrl: string | null = null;
  let storedGlbUrl: string | null = null;

  const [imgIngest, glbIngest] = await Promise.all([
    ingestProviderUrlToR2({
      userId: args.userId,
      pieceId: piece.id,
      sourceUrl: args.providerImageUrl,
      kind: "image",
    }),
    ingestProviderUrlToR2({
      userId: args.userId,
      pieceId: piece.id,
      sourceUrl: args.providerGlbUrl,
      kind: "glb",
    }),
  ]);

  if (imgIngest.ok) {
    storedImageUrl = imgIngest.publicUrl;
  }
  if (glbIngest.ok) {
    storedGlbUrl = glbIngest.publicUrl;
  }

  if (storedImageUrl !== null || storedGlbUrl !== null) {
    await prisma.furnitureStudioPiece.update({
      where: { id: piece.id },
      data: {
        ...(storedImageUrl !== null ? { storedImageUrl } : {}),
        ...(storedGlbUrl !== null ? { storedGlbUrl } : {}),
      },
    });
  }

  const displayImageUrl = storedImageUrl ?? args.providerImageUrl;
  const displayGlbUrl = storedGlbUrl ?? args.providerGlbUrl;

  return {
    ok: true,
    piece: {
      id: piece.id,
      title: piece.title,
      displayImageUrl,
      displayGlbUrl,
      sourcePieceId: piece.sourcePieceId,
    },
  };
}
