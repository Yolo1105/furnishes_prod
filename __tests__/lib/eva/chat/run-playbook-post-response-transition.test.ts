import { describe, expect, it, vi, beforeEach } from "vitest";
import { runPlaybookPostResponseTransition } from "@/lib/eva/chat/post/run-playbook-post-response-transition";
import * as helpers from "@/lib/eva/api/helpers";
import * as runtime from "@/lib/eva/playbook/runtime";
import type { PlaybookGraph, PlaybookNode } from "@/lib/eva/playbook/types";

const getPreferencesAsRecord = vi.spyOn(helpers, "getPreferencesAsRecord");
const evaluateTransitions = vi.spyOn(runtime, "evaluateTransitions");
const transitionTo = vi.spyOn(runtime, "transitionTo");

describe("runPlaybookPostResponseTransition", () => {
  beforeEach(() => {
    getPreferencesAsRecord.mockReset();
    evaluateTransitions.mockReset();
    transitionTo.mockReset();
    getPreferencesAsRecord.mockResolvedValue({});
    evaluateTransitions.mockReturnValue({
      shouldTransition: false,
      nextNode: null,
      firedEdge: null,
      reason: "no transition",
    });
  });

  it("skips work when first-message transition already ran", async () => {
    await runPlaybookPostResponseTransition({
      conversationId: "c1",
      activeNode: { id: "n1" } as PlaybookNode,
      playbookGraph: { nodes: [], edges: [] } as unknown as PlaybookGraph,
      userMessage: "hi",
      messageCount: 1,
      firstMessageTransitioned: true,
    });

    expect(getPreferencesAsRecord).not.toHaveBeenCalled();
    expect(evaluateTransitions).not.toHaveBeenCalled();
  });

  it("evaluates transitions when graph and node are present", async () => {
    const node = { id: "n1" } as PlaybookNode;
    const graph = { nodes: [node], edges: [] } as unknown as PlaybookGraph;

    await runPlaybookPostResponseTransition({
      conversationId: "c1",
      activeNode: node,
      playbookGraph: graph,
      userMessage: "next step please",
      messageCount: 2,
      firstMessageTransitioned: false,
    });

    expect(getPreferencesAsRecord).toHaveBeenCalled();
    expect(evaluateTransitions).toHaveBeenCalledWith(
      graph,
      node,
      {},
      "next step please",
      2,
      null,
    );
  });
});
