import { describe, expect, it } from "vitest";
import type { Conversation } from "@studio/store/types";
import { mergePulledConversations } from "@studio/persistence/conversation-merge";

function convo(
  overrides: Partial<Conversation> &
    Pick<Conversation, "id" | "projectId" | "title">,
): Conversation {
  return {
    turns: [],
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  };
}

describe("mergePulledConversations", () => {
  it("keeps other projects and prefers server rows for the pulled project", () => {
    const local = [
      convo({ id: "blank-1", projectId: "blank", title: "Conversation 1" }),
      convo({ id: "demo-local", projectId: "demo", title: "Conversation 1" }),
    ];
    const server = [
      convo({ id: "demo-server", projectId: "demo", title: "Conversation 1" }),
    ];

    const merged = mergePulledConversations(local, "demo", server);

    expect(merged.map((c) => c.id).sort()).toEqual(["blank-1", "demo-server"]);
  });

  it("drops empty local-only threads that duplicate a server title", () => {
    const local = [
      convo({ id: "local-2", projectId: "demo", title: "Conversation 2" }),
    ];
    const server = [
      convo({ id: "server-2", projectId: "demo", title: "Conversation 2" }),
    ];

    const merged = mergePulledConversations(local, "demo", server);

    expect(merged).toEqual(server);
  });

  it("keeps unsynced local threads with unique titles", () => {
    const local = [
      convo({ id: "local-new", projectId: "demo", title: "E2E Demo 1" }),
    ];
    const server = [
      convo({ id: "server-1", projectId: "demo", title: "Conversation 1" }),
    ];

    const merged = mergePulledConversations(local, "demo", server);

    expect(merged.map((c) => c.id).sort()).toEqual(["local-new", "server-1"]);
  });
});
