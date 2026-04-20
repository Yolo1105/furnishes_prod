import "server-only";

import { prisma } from "@/lib/db/prisma";
import type { Upload } from "@/lib/site/account/types";

export async function getAccountUploads(userId: string): Promise<Upload[]> {
  const rows = await prisma.upload.findMany({
    where: { userId },
    orderBy: { uploadedAt: "desc" },
    include: {
      project: { select: { title: true } },
    },
  });

  const convIds = rows
    .map((r) => r.linkedConversationId)
    .filter((x): x is string => !!x);
  const convos =
    convIds.length > 0
      ? await prisma.conversation.findMany({
          where: { id: { in: [...new Set(convIds)] } },
          select: { id: true, title: true },
        })
      : [];
  const titleById = new Map(convos.map((c) => [c.id, c.title]));

  return rows.map((u) => ({
    id: u.id,
    filename: u.filename,
    room: u.room,
    width: u.width,
    height: u.height,
    coverHue: u.coverHue,
    analysis: u.analysis,
    linkedConversationId: u.linkedConversationId ?? undefined,
    linkedConversationTitle: u.linkedConversationId
      ? titleById.get(u.linkedConversationId)
      : undefined,
    projectId: u.projectId ?? undefined,
    projectName: u.project?.title ?? null,
    uploadedAt: u.uploadedAt.toISOString(),
  }));
}

export async function getAccountUploadById(
  userId: string,
  id: string,
): Promise<Upload | null> {
  const u = await prisma.upload.findFirst({
    where: { id, userId },
    include: {
      project: { select: { title: true } },
    },
  });
  if (!u) return null;

  let linkedConversationTitle: string | undefined;
  if (u.linkedConversationId) {
    const c = await prisma.conversation.findUnique({
      where: { id: u.linkedConversationId },
      select: { title: true },
    });
    linkedConversationTitle = c?.title;
  }

  return {
    id: u.id,
    filename: u.filename,
    room: u.room,
    width: u.width,
    height: u.height,
    coverHue: u.coverHue,
    analysis: u.analysis,
    linkedConversationId: u.linkedConversationId ?? undefined,
    linkedConversationTitle,
    projectId: u.projectId ?? undefined,
    projectName: u.project?.title ?? null,
    uploadedAt: u.uploadedAt.toISOString(),
  };
}
