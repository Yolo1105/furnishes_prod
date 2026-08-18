import { prisma } from "@/server/db";
import {
  toConversationRow,
  toMessageRow,
  type PlaygroundConversationMessageRow,
  type PlaygroundConversationRow,
} from "./playground-conversation-types";

async function assertOwnedProject(ownerId: string, projectId: string) {
  return prisma.canvasPlaygroundProject.findFirst({
    where: { id: projectId, ownerId },
    select: { id: true },
  });
}

async function assertOwnedConversation(
  ownerId: string,
  conversationId: string,
) {
  return prisma.canvasPlaygroundConversation.findFirst({
    where: { id: conversationId, ownerId },
    select: { id: true, projectId: true },
  });
}

export async function listPlaygroundConversations(
  ownerId: string,
  projectId: string,
): Promise<PlaygroundConversationRow[] | "forbidden"> {
  const project = await assertOwnedProject(ownerId, projectId);
  if (!project) return "forbidden";

  const rows = await prisma.canvasPlaygroundConversation.findMany({
    where: { ownerId, projectId },
    orderBy: { updatedAt: "desc" },
  });
  return rows.map(toConversationRow);
}

export async function createPlaygroundConversation(
  ownerId: string,
  input: { id: string; projectId: string; title: string },
): Promise<
  | { ok: true; conversation: PlaygroundConversationRow }
  | { ok: false; status: 403 | 409 }
> {
  const project = await assertOwnedProject(ownerId, input.projectId);
  if (!project) return { ok: false, status: 403 };

  const existing = await prisma.canvasPlaygroundConversation.findFirst({
    where: { id: input.id, ownerId },
  });
  if (existing) {
    return { ok: true, conversation: toConversationRow(existing) };
  }

  const row = await prisma.canvasPlaygroundConversation.create({
    data: {
      id: input.id,
      ownerId,
      projectId: input.projectId,
      title: input.title,
    },
  });
  return { ok: true, conversation: toConversationRow(row) };
}

export async function renamePlaygroundConversation(
  ownerId: string,
  conversationId: string,
  title: string,
): Promise<
  | { ok: true; conversation: PlaygroundConversationRow }
  | { ok: false; status: 404 }
> {
  const current = await assertOwnedConversation(ownerId, conversationId);
  if (!current) return { ok: false, status: 404 };

  const row = await prisma.canvasPlaygroundConversation.update({
    where: { id: conversationId },
    data: { title },
  });
  return { ok: true, conversation: toConversationRow(row) };
}

export async function deletePlaygroundConversation(
  ownerId: string,
  conversationId: string,
): Promise<boolean> {
  const result = await prisma.canvasPlaygroundConversation.deleteMany({
    where: { id: conversationId, ownerId },
  });
  return result.count > 0;
}

export async function listPlaygroundConversationMessages(
  ownerId: string,
  conversationId: string,
): Promise<PlaygroundConversationMessageRow[] | "not_found"> {
  const current = await assertOwnedConversation(ownerId, conversationId);
  if (!current) return "not_found";

  const rows = await prisma.canvasPlaygroundConversationTurn.findMany({
    where: { conversationId },
    orderBy: [{ createdAt: "asc" }, { positionHint: "asc" }],
  });
  return rows.map(toMessageRow);
}

export async function appendPlaygroundConversationTurn(
  ownerId: string,
  conversationId: string,
  input: {
    id: string;
    userText: string;
    response: string;
    displayTime: string;
    metadata?: Record<string, unknown> | undefined;
  },
): Promise<
  | { ok: true; message: PlaygroundConversationMessageRow }
  | { ok: false; status: 404 | 409 }
> {
  const current = await assertOwnedConversation(ownerId, conversationId);
  if (!current) return { ok: false, status: 404 };

  const existing = await prisma.canvasPlaygroundConversationTurn.findFirst({
    where: { id: input.id, conversationId },
  });
  if (existing) {
    return { ok: true, message: toMessageRow(existing) };
  }

  const count = await prisma.canvasPlaygroundConversationTurn.count({
    where: { conversationId },
  });

  const turnData = {
    id: input.id,
    conversationId,
    userText: input.userText,
    response: input.response,
    displayTime: input.displayTime,
    positionHint: count,
    ...(input.metadata !== undefined
      ? { metadata: input.metadata as object }
      : {}),
  };

  const [turn] = await prisma.$transaction([
    prisma.canvasPlaygroundConversationTurn.create({
      data: turnData,
    }),
    prisma.canvasPlaygroundConversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    }),
  ]);

  return { ok: true, message: toMessageRow(turn) };
}
