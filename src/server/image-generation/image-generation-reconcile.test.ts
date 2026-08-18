import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/server/db", () => ({
  prisma: {
    imageGeneration: { findMany: vi.fn(), updateMany: vi.fn() },
  },
}));

vi.mock("./image-generation-service", () => ({
  refreshImageGeneration: vi.fn(),
}));

import { prisma } from "@/server/db";
import { refreshImageGeneration } from "./image-generation-service";
import { reconcileStuckImageGenerations } from "./image-generation-reconcile";

const now = new Date("2026-01-01T12:00:00.000Z");
const minutesAgo = (minutes: number) =>
  new Date(now.getTime() - minutes * 60_000);

function rows(...values: Array<Record<string, unknown>>) {
  vi.mocked(prisma.imageGeneration.findMany).mockResolvedValue(
    values as never[],
  );
}

describe("reconcileStuckImageGenerations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.imageGeneration.updateMany).mockResolvedValue({
      count: 1,
    } as never);
  });

  it("fails rows the provider never acknowledged", async () => {
    rows({
      id: "g1",
      userId: "u1",
      createdAt: minutesAgo(5),
      providerJobId: null,
    });

    const result = await reconcileStuckImageGenerations(now);

    expect(result).toMatchObject({ examined: 1, abandoned: 1, advanced: 0 });
    expect(refreshImageGeneration).not.toHaveBeenCalled();
    expect(prisma.imageGeneration.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "failed",
          errorCode: "provider_no_job",
        }),
      }),
    );
  });

  it("fails rows older than the abandon window", async () => {
    rows({
      id: "g1",
      userId: "u1",
      createdAt: minutesAgo(45),
      providerJobId: "job-1",
    });

    const result = await reconcileStuckImageGenerations(now);

    expect(result).toMatchObject({ abandoned: 1 });
    expect(refreshImageGeneration).not.toHaveBeenCalled();
    expect(prisma.imageGeneration.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ errorCode: "provider_timeout" }),
      }),
    );
  });

  it("counts rows that reach a terminal status as advanced", async () => {
    rows({
      id: "g1",
      userId: "u1",
      createdAt: minutesAgo(5),
      providerJobId: "job-1",
    });
    vi.mocked(refreshImageGeneration).mockResolvedValue({
      ok: true,
      value: { status: "ready" },
    } as never);

    const result = await reconcileStuckImageGenerations(now);

    expect(result).toMatchObject({ advanced: 1, abandoned: 0, unresolved: 0 });
    expect(refreshImageGeneration).toHaveBeenCalledWith("u1", "g1");
  });

  it("leaves still-generating rows for the next run", async () => {
    rows({
      id: "g1",
      userId: "u1",
      createdAt: minutesAgo(5),
      providerJobId: "job-1",
    });
    vi.mocked(refreshImageGeneration).mockResolvedValue({
      ok: true,
      value: { status: "generating" },
    } as never);

    const result = await reconcileStuckImageGenerations(now);

    expect(result).toMatchObject({ advanced: 0, unresolved: 1 });
    expect(prisma.imageGeneration.updateMany).not.toHaveBeenCalled();
  });

  it("stops early when the provider is unavailable", async () => {
    rows(
      {
        id: "g1",
        userId: "u1",
        createdAt: minutesAgo(5),
        providerJobId: "job-1",
      },
      {
        id: "g2",
        userId: "u2",
        createdAt: minutesAgo(4),
        providerJobId: "job-2",
      },
    );
    vi.mocked(refreshImageGeneration).mockResolvedValue({
      ok: false,
      error: "provider_unavailable",
    } as never);

    const result = await reconcileStuckImageGenerations(now);

    expect(refreshImageGeneration).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ examined: 2, unresolved: 1 });
  });

  it("only re-polls rows that have gone stale", async () => {
    rows();
    await reconcileStuckImageGenerations(now);

    expect(prisma.imageGeneration.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          status: { in: ["queued", "generating"] },
          updatedAt: { lt: minutesAgo(3) },
        },
      }),
    );
  });
});
