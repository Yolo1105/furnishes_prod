import { prisma } from "@/lib/eva/db";
import { requireConversationAccess } from "@/lib/eva/auth/helpers";
import { apiError, ErrorCodes } from "@/lib/eva/api/error";
import { classifyArtifact } from "@/lib/eva/artifact-classify";
import {
  deriveArtifactDescription,
  deriveArtifactTags,
} from "@/lib/eva-dashboard/artifact-metadata";
import type { ConversationArtifact } from "@/lib/eva-dashboard/conversation-output-types";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { error, status } = await requireConversationAccess(id, req);
  if (error) {
    return apiError(
      status === 404 ? ErrorCodes.NOT_FOUND : ErrorCodes.FORBIDDEN,
      error,
      status,
    );
  }
  try {
    const rows = await prisma.file.findMany({
      where: { conversationId: id },
      orderBy: { createdAt: "desc" },
    });

    const files: ConversationArtifact[] = rows.map((f) => {
      const mime = f.type ?? null;
      const fileType = classifyArtifact(mime, f.filename);
      const storageUrl = (f.url ?? "").trim();
      const sourceType: "remote" | "upload" = storageUrl.startsWith("http")
        ? "remote"
        : "upload";
      const downloadable = storageUrl.length > 0;
      const downloadUrl = downloadable
        ? `/api/conversations/${id}/files/${f.id}/download`
        : "";
      const description = deriveArtifactDescription({
        fileType,
        mimeType: mime,
        sourceType,
      });
      const tags = deriveArtifactTags(fileType, sourceType);
      return {
        id: f.id,
        conversationId: f.conversationId,
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
    return Response.json(files);
  } catch (e) {
    return apiError(
      ErrorCodes.INTERNAL_ERROR,
      e instanceof Error ? e.message : "Failed to list files",
      500,
    );
  }
}
