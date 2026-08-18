import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/server/db";
import {
  createTestUser,
  deleteTestUsers,
} from "@/server/test-support/db-fixtures";
import { createImageGeneration } from "@/server/image-generation/image-generation-service";
import { resetTestProviderJobs } from "@/server/image-generation/provider-test";
import {
  createStudioPieceFromGeneration,
  createStudioPieceFromInput,
  deleteStudioPiece,
  getStudioPiece,
  listStudioPieces,
  updateStudioPiece,
} from "./piece-service";
import { createStudioPieceSchema } from "./piece-schema";

const hasDb = Boolean(process.env.DATABASE_URL);

describe("createStudioPieceSchema", () => {
  it("requires exactly one of imageGenerationId or prompt", () => {
    expect(createStudioPieceSchema.safeParse({}).success).toBe(false);
    expect(
      createStudioPieceSchema.safeParse({
        imageGenerationId: "clxxxxxxxxxxxxxxxxxxxxxxxxx",
        prompt: "oak chair",
      }).success,
    ).toBe(false);
    expect(
      createStudioPieceSchema.safeParse({
        imageGenerationId: "clxxxxxxxxxxxxxxxxxxxxxxxxx",
      }).success,
    ).toBe(true);
    expect(
      createStudioPieceSchema.safeParse({ prompt: "oak chair" }).success,
    ).toBe(true);
  });
});

describe.runIf(hasDb)("studio piece service", () => {
  let userId = "";
  let strangerId = "";

  beforeAll(async () => {
    process.env.IMAGE_GENERATION_PROVIDER = "test";
    process.env.NEXT_PUBLIC_E2E = "1";
    process.env.IMAGE_GENERATION_DAILY_LIMIT = "500";
    process.env.IMAGE_GENERATION_MAX_CONCURRENT_PER_USER = "20";
    resetTestProviderJobs();
    // Own users: this file creates image generations, which would otherwise
    // count against the seeded owner's quota in other files.
    userId = (await createTestUser("studio-owner")).id;
    strangerId = (await createTestUser("studio-stranger")).id;
  });

  afterAll(async () => {
    await deleteTestUsers(userId, strangerId);
  });

  it("returns disabled when STUDIO_ENABLED is not set", async () => {
    delete process.env.STUDIO_ENABLED;
    const result = await listStudioPieces(userId);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe("disabled");
  });

  it("creates, lists, patches, and deletes owned pieces from ready generations", async () => {
    process.env.STUDIO_ENABLED = "1";

    const generation = await createImageGeneration(userId, {
      prompt: "studio test-ready walnut side table",
      width: 1024,
      height: 1024,
    });
    expect(generation.ok).toBe(true);
    if (!generation.ok) return;

    const created = await createStudioPieceFromGeneration({
      userId,
      imageGenerationId: generation.value.id,
      title: "Side table concept",
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    expect(created.value.title).toBe("Side table concept");
    expect(created.value.outputUploadId).toBe(generation.value.outputUploadId);

    const listed = await listStudioPieces(userId);
    expect(listed.ok).toBe(true);
    if (!listed.ok) return;
    expect(
      listed.value.items.some((item) => item.id === created.value.id),
    ).toBe(true);

    const fetched = await getStudioPiece(userId, created.value.id);
    expect(fetched.ok).toBe(true);

    const renamed = await updateStudioPiece(userId, created.value.id, {
      title: "Renamed side table",
    });
    expect(renamed.ok).toBe(true);
    if (renamed.ok) {
      expect(renamed.value.title).toBe("Renamed side table");
    }

    const strangerRead = await getStudioPiece(strangerId, created.value.id);
    expect(strangerRead.ok).toBe(false);
    if (strangerRead.ok) return;
    expect(strangerRead.error).toBe("not_found");

    const deleted = await deleteStudioPiece(userId, created.value.id);
    expect(deleted.ok).toBe(true);

    const generationStillThere = await prisma.imageGeneration.findUnique({
      where: { id: generation.value.id },
    });
    expect(generationStillThere).not.toBeNull();
  });

  it("rejects non-ready generations and duplicate links", async () => {
    process.env.STUDIO_ENABLED = "1";

    const delayed = await createImageGeneration(userId, {
      prompt: "test-delayed studio piece",
      width: 768,
      height: 768,
    });
    expect(delayed.ok).toBe(true);
    if (!delayed.ok) return;

    const notReady = await createStudioPieceFromGeneration({
      userId,
      imageGenerationId: delayed.value.id,
    });
    expect(notReady.ok).toBe(false);
    if (notReady.ok) return;
    expect(notReady.error).toBe("validation");

    const ready = await createImageGeneration(userId, {
      prompt: "studio duplicate test",
      width: 1024,
      height: 1024,
    });
    expect(ready.ok).toBe(true);
    if (!ready.ok) return;

    const first = await createStudioPieceFromGeneration({
      userId,
      imageGenerationId: ready.value.id,
    });
    expect(first.ok).toBe(true);

    const duplicate = await createStudioPieceFromGeneration({
      userId,
      imageGenerationId: ready.value.id,
    });
    expect(duplicate.ok).toBe(false);
    if (duplicate.ok) return;
    expect(duplicate.error).toBe("validation");

    if (first.ok) {
      await deleteStudioPiece(userId, first.value.id);
    }
  });

  it("creates from prompt when generation is immediately ready", async () => {
    process.env.STUDIO_ENABLED = "1";

    const created = await createStudioPieceFromInput(userId, {
      prompt: "test-ready studio walnut bench",
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    expect(created.value.imageGenerationId).toBeTruthy();
    await deleteStudioPiece(userId, created.value.id);
  });
});
