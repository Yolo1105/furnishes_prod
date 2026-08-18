import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/server/db", () => ({
  prisma: {
    canvasPlaygroundProject: { findFirst: vi.fn() },
    canvasPlaygroundConversation: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn(),
    },
    canvasPlaygroundConversationTurn: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

import { prisma } from "@/server/db";
import {
  appendPlaygroundConversationTurn,
  createPlaygroundConversation,
  listPlaygroundConversations,
} from "./playground-conversation-store";

const ownerId = "user-1";
const projectId = "proj-1";

describe("playground-conversation-store", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("listPlaygroundConversations returns forbidden when project not owned", async () => {
    vi.mocked(prisma.canvasPlaygroundProject.findFirst).mockResolvedValue(null);
    const result = await listPlaygroundConversations(ownerId, projectId);
    expect(result).toBe("forbidden");
  });

  it("createPlaygroundConversation inserts when project is owned", async () => {
    vi.mocked(prisma.canvasPlaygroundProject.findFirst).mockResolvedValue({
      id: projectId,
    } as never);
    vi.mocked(prisma.canvasPlaygroundConversation.findFirst).mockResolvedValue(
      null,
    );
    vi.mocked(prisma.canvasPlaygroundConversation.create).mockResolvedValue({
      id: "convo_1",
      ownerId,
      projectId,
      title: "Conversation 1",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-02T00:00:00.000Z"),
    } as never);

    const result = await createPlaygroundConversation(ownerId, {
      id: "convo_1",
      projectId,
      title: "Conversation 1",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.conversation.project_id).toBe(projectId);
    }
  });

  it("appendPlaygroundConversationTurn bumps parent updatedAt", async () => {
    vi.mocked(prisma.canvasPlaygroundConversation.findFirst).mockResolvedValue({
      id: "convo_1",
      projectId,
    } as never);
    vi.mocked(
      prisma.canvasPlaygroundConversationTurn.findFirst,
    ).mockResolvedValue(null);
    vi.mocked(prisma.canvasPlaygroundConversationTurn.count).mockResolvedValue(
      0,
    );
    const turnRow = {
      id: "msg_1",
      conversationId: "convo_1",
      userText: "hi",
      response: "hello",
      displayTime: "10:00",
      metadata: { localId: 1 },
      positionHint: 0,
      createdAt: new Date("2026-01-03T00:00:00.000Z"),
    };
    vi.mocked(prisma.$transaction).mockResolvedValue([turnRow] as never);

    const result = await appendPlaygroundConversationTurn(ownerId, "convo_1", {
      id: "msg_1",
      userText: "hi",
      response: "hello",
      displayTime: "10:00",
      metadata: { localId: 1 },
    });
    expect(result.ok).toBe(true);
    expect(prisma.$transaction).toHaveBeenCalledOnce();
  });
});
