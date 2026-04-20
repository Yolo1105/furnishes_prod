import type { PrismaClient } from "@prisma/client";
import { classifyArtifact } from "@/lib/eva/artifact-classify";
import {
  deriveArtifactDescription,
  deriveArtifactTags,
} from "@/lib/eva-dashboard/artifact-metadata";
import type { ConversationArtifact } from "@/lib/eva-dashboard/conversation-output-types";

/**
 * All chat files linked to conversations in this project (newest first).
 */
export async function listProjectArtifacts(
  db: PrismaClient,
  projectId: string,
): Promise<ConversationArtifact[]> {
  const conversations = await db.conversation.findMany({
    where: { projectId },
    select: { id: true },
  });
  const convoIds = conversations.map((c) => c.id);
  if (convoIds.length === 0) return [];

  const rows = await db.file.findMany({
    where: { conversationId: { in: convoIds } },
    orderBy: { createdAt: "desc" },
  });

  return rows.map((f) => {
    const cid = f.conversationId;
    const mime = f.type ?? null;
    const fileType = classifyArtifact(mime, f.filename);
    const storageUrl = (f.url ?? "").trim();
    const sourceType: "remote" | "upload" = storageUrl.startsWith("http")
      ? "remote"
      : "upload";
    const downloadable = storageUrl.length > 0;
    const downloadUrl = downloadable
      ? `/api/conversations/${cid}/files/${f.id}/download`
      : "";
    const description = deriveArtifactDescription({
      fileType,
      mimeType: mime,
      sourceType,
    });
    const tags = deriveArtifactTags(fileType, sourceType);
    return {
      id: f.id,
      conversationId: cid,
      title: f.filename,
      description,
      fileType,
      mimeType: mime,
      previewUrl: storageUrl,
      downloadUrl,
      createdAt: f.createdAt.toISOString(),
      tags,
      sourceType,
      downloadable,
    };
  });
}

/**
 * Favorites first, then remainder (preserving each segment’s existing order).
 * Shared by project summary + intelligence context to avoid duplicated filter/slice logic.
 */
export function orderArtifactsFavoritesFirst<T extends { id: string }>(
  items: T[],
  favoriteIds: Set<string>,
  max: number,
): T[] {
  return [
    ...items.filter((a) => favoriteIds.has(a.id)),
    ...items.filter((a) => !favoriteIds.has(a.id)),
  ].slice(0, max);
}
