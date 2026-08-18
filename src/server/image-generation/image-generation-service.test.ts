import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/server/db";
import {
  createTestProject,
  createTestUser,
  deleteTestUsers,
} from "@/server/test-support/db-fixtures";
import {
  cancelImageGeneration,
  createImageGeneration,
  deleteImageGeneration,
  listImageGenerations,
  refreshImageGeneration,
  retryImageGeneration,
} from "./image-generation-service";
import { countGenerationsToday } from "./image-generation-rate-limit";
import { resetTestProviderJobs } from "./provider-test";
import {
  createInspirationItem,
  deleteInspirationItem,
  listInspirationItems,
  updateInspirationItem,
} from "@/server/inspiration/inspiration-service";

const hasDb = Boolean(process.env.DATABASE_URL);

describe.runIf(hasDb)("image generation + inspiration services", () => {
  let userId = "";
  let strangerId = "";
  let projectId = "";

  beforeAll(async () => {
    process.env.IMAGE_GENERATION_PROVIDER = "test";
    process.env.NEXT_PUBLIC_E2E = "1";
    process.env.IMAGE_GENERATION_DAILY_LIMIT = "500";
    process.env.IMAGE_GENERATION_MAX_CONCURRENT_PER_USER = "20";
    resetTestProviderJobs();
    // Own users: the daily-limit test reads a count and then asserts the next
    // create succeeds, so any concurrent create by another file breaks it.
    userId = (await createTestUser("image-gen-owner")).id;
    strangerId = (await createTestUser("image-gen-stranger")).id;
    projectId = (await createTestProject(userId, "Living room refresh")).id;
  });

  afterAll(async () => {
    await deleteTestUsers(userId, strangerId);
  });

  it("creates an immediate ready generation and stores a private upload", async () => {
    const created = await createImageGeneration(userId, {
      prompt: "test-ready unit oak room",
      width: 1024,
      height: 1024,
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    expect(created.value.status).toBe("ready");
    expect(created.value.outputUploadId).toBeTruthy();
  });

  it("polls delayed generations to ready", async () => {
    const created = await createImageGeneration(userId, {
      prompt: "test-delayed unit room",
      width: 768,
      height: 768,
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    expect(["queued", "generating"]).toContain(created.value.status);
    await refreshImageGeneration(userId, created.value.id);
    const ready = await refreshImageGeneration(userId, created.value.id);
    expect(ready.ok).toBe(true);
    if (!ready.ok) return;
    expect(ready.value.status).toBe("ready");
  });

  it("fails, retries as a new record, and cancels active jobs", async () => {
    const failed = await createImageGeneration(userId, {
      prompt: "test-fail unit",
      width: 768,
      height: 768,
    });
    expect(failed.ok).toBe(true);
    if (!failed.ok) return;
    expect(failed.value.status).toBe("failed");

    const retried = await retryImageGeneration(userId, failed.value.id);
    expect(retried.ok).toBe(true);
    if (!retried.ok) return;
    expect(retried.value.id).not.toBe(failed.value.id);

    const active = await createImageGeneration(userId, {
      prompt: "test-cancel unit",
      width: 768,
      height: 768,
    });
    expect(active.ok).toBe(true);
    if (!active.ok) return;
    const canceled = await cancelImageGeneration(userId, active.value.id);
    expect(canceled.ok).toBe(true);
    if (!canceled.ok) return;
    expect(canceled.value.status).toBe("canceled");
  });

  it("associates generations with an owned project and denies strangers", async () => {
    const created = await createImageGeneration(userId, {
      prompt: "test-ready project linked",
      width: 768,
      height: 768,
      projectId,
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    expect(created.value.projectId).toBe(projectId);
    expect(created.value.projectName).toBe("Living room refresh");

    const denied = await createImageGeneration(strangerId, {
      prompt: "test-ready hijack project",
      width: 768,
      height: 768,
      projectId,
    });
    expect(denied.ok).toBe(false);
    if (denied.ok) return;
    expect(denied.error).toBe("forbidden");
  });

  it("enforces daily generation limits", async () => {
    const previous = process.env.IMAGE_GENERATION_DAILY_LIMIT;
    const today = await countGenerationsToday(userId);
    process.env.IMAGE_GENERATION_DAILY_LIMIT = String(today + 1);
    try {
      const allowed = await createImageGeneration(userId, {
        prompt: "test-ready daily allowed",
        width: 768,
        height: 768,
      });
      expect(allowed.ok).toBe(true);
      const blocked = await createImageGeneration(userId, {
        prompt: "test-ready daily blocked",
        width: 768,
        height: 768,
      });
      expect(blocked.ok).toBe(false);
      if (blocked.ok) return;
      expect(blocked.error).toBe("rate_limited");
    } finally {
      process.env.IMAGE_GENERATION_DAILY_LIMIT = previous ?? "500";
    }
  });

  it("enforces concurrent limits atomically under racing creates", async () => {
    const previous = process.env.IMAGE_GENERATION_MAX_CONCURRENT_PER_USER;
    process.env.IMAGE_GENERATION_MAX_CONCURRENT_PER_USER = "1";

    const active = await prisma.imageGeneration.findMany({
      where: { userId, status: { in: ["queued", "generating"] } },
      select: { id: true },
    });
    for (const row of active) {
      await cancelImageGeneration(userId, row.id);
    }

    try {
      const [first, second] = await Promise.all([
        createImageGeneration(userId, {
          prompt: "test-delayed race-a",
          width: 768,
          height: 768,
        }),
        createImageGeneration(userId, {
          prompt: "test-delayed race-b",
          width: 768,
          height: 768,
        }),
      ]);
      const outcomes = [first, second];
      const okCount = outcomes.filter((row) => row.ok).length;
      const limited = outcomes.find(
        (row) => !row.ok && row.error === "concurrency_limit",
      );
      expect(okCount).toBe(1);
      expect(limited).toBeTruthy();

      for (const row of outcomes) {
        if (row.ok && ["queued", "generating"].includes(row.value.status)) {
          await cancelImageGeneration(userId, row.value.id);
        }
      }
    } finally {
      process.env.IMAGE_GENERATION_MAX_CONCURRENT_PER_USER = previous ?? "20";
    }
  });

  it("paginates generation history with a cursor", async () => {
    const listed = await listImageGenerations(userId);
    expect(listed.items.length).toBeGreaterThan(0);
    for (let index = 0; index < 3; index += 1) {
      await createImageGeneration(userId, {
        prompt: `test-ready page-${index}`,
        width: 768,
        height: 768,
      });
    }
    const { listOwnedGenerations } =
      await import("./image-generation-repository");
    const page = await listOwnedGenerations(userId, { take: 2 });
    expect(page.items).toHaveLength(2);
    expect(page.nextCursor).toBeTruthy();
    const more = await listOwnedGenerations(userId, {
      take: 2,
      cursor: page.nextCursor,
    });
    expect(more.items.length).toBeGreaterThan(0);
    expect(more.items[0]!.id).not.toBe(page.items[0]!.id);
  });

  it("saves inspiration colors/materials, filters by project, and deletes source-free", async () => {
    const generation = await createImageGeneration(userId, {
      prompt: "test-ready inspiration source",
      width: 1024,
      height: 1024,
    });
    expect(generation.ok).toBe(true);
    if (!generation.ok) return;

    const saved = await createInspirationItem(userId, {
      imageGenerationId: generation.value.id,
      title: "Unit inspiration",
      projectId,
      colors: ["oak"],
      materials: ["linen"],
    });
    expect(saved.ok).toBe(true);
    if (!saved.ok) return;
    expect(saved.value.colors).toEqual(["oak"]);
    expect(saved.value.materials).toEqual(["linen"]);
    expect(saved.value.projectId).toBe(projectId);

    const duplicate = await createInspirationItem(userId, {
      imageGenerationId: generation.value.id,
    });
    expect(duplicate.ok).toBe(false);
    if (duplicate.ok) return;
    expect(duplicate.error).toBe("duplicate");

    const updated = await updateInspirationItem(userId, saved.value.id, {
      note: "Updated note",
      roomLabel: "Study",
      colors: ["terracotta", "cream"],
      materials: ["oak", "stone"],
      projectId: null,
    });
    expect(updated.ok).toBe(true);
    if (!updated.ok) return;
    expect(updated.value.note).toBe("Updated note");
    expect(updated.value.colors).toEqual(["terracotta", "cream"]);
    expect(updated.value.materials).toEqual(["oak", "stone"]);
    expect(updated.value.projectId).toBeNull();

    const reassigned = await updateInspirationItem(userId, saved.value.id, {
      projectId,
    });
    expect(reassigned.ok).toBe(true);
    if (!reassigned.ok) return;
    expect(reassigned.value.projectId).toBe(projectId);

    const filtered = await listInspirationItems(userId, { projectId });
    expect(filtered.items.some((item) => item.id === saved.value.id)).toBe(
      true,
    );

    const removed = await deleteInspirationItem(userId, saved.value.id);
    expect(removed.ok).toBe(true);

    const stillThere = await prisma.imageGeneration.findUnique({
      where: { id: generation.value.id },
    });
    expect(stillThere).toBeTruthy();
    expect(stillThere?.outputUploadId).toBeTruthy();

    const deleted = await deleteImageGeneration(userId, generation.value.id);
    expect(deleted.ok).toBe(true);
    const gone = await prisma.imageGeneration.findUnique({
      where: { id: generation.value.id },
    });
    expect(gone).toBeNull();
  });

  it("denies unrelated user generation access", async () => {
    const created = await createImageGeneration(userId, {
      prompt: "test-ready private",
      width: 768,
      height: 768,
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const denied = await refreshImageGeneration(strangerId, created.value.id);
    expect(denied.ok).toBe(false);
    if (denied.ok) return;
    expect(denied.error).toBe("not_found");
  });
});
