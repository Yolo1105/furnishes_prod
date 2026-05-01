import { describe, expect, it } from "vitest";
import {
  PlaygroundPersistedEnvelopeSchema,
  PutPlaygroundSnapshotBodySchema,
  parsePersistedEnvelope,
} from "@/lib/studio/server/playground-persisted-schema";

const minimalSnapshot = {
  schemaVersion: "3.5.0",
  id: "proj_1",
  name: "Test",
  createdAt: 1,
  updatedAt: 2,
  sceneSource: "viewer" as const,
  items: [],
  furnitureFull: [],
  roomMeta: null,
  walls: [],
  openings: [],
  styleBible: null,
  originalScene: null,
  referenceImageUrl: null,
  requirements: {},
  conversations: [],
  activeConversationId: null,
  preferences: [],
  generations: {
    candidates: [],
    appliedIndex: null,
    inspectIndex: null,
    history: [],
    assetGenerations: [],
  },
  profile: null,
};

describe("playground-persisted-schema", () => {
  it("parses persisted envelope", () => {
    const raw = { revision: 1, snapshot: minimalSnapshot };
    const r = parsePersistedEnvelope(raw);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.revision).toBe(1);
      expect(r.value.snapshot.id).toBe("proj_1");
    }
  });

  it("rejects envelope without revision", () => {
    const r = parsePersistedEnvelope({ snapshot: minimalSnapshot });
    expect(r.ok).toBe(false);
  });

  it("accepts PUT body with optional expectedRevision", () => {
    const a = PutPlaygroundSnapshotBodySchema.safeParse({
      snapshot: minimalSnapshot,
    });
    expect(a.success).toBe(true);

    const b = PutPlaygroundSnapshotBodySchema.safeParse({
      expectedRevision: 2,
      snapshot: minimalSnapshot,
    });
    expect(b.success).toBe(true);
  });

  it("validates envelope schema", () => {
    const v = PlaygroundPersistedEnvelopeSchema.safeParse({
      revision: 3,
      snapshot: minimalSnapshot,
    });
    expect(v.success).toBe(true);
  });
});
