import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/server/db", () => ({
  prisma: {
    canvasPlaygroundProject: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      findFirst: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

import { prisma } from "@/server/db";
import {
  createProject,
  ensureStarterProject,
  listProjects,
} from "./playground-project-store";

const ownerId = "user-owner";

describe("playground-project-store", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("listProjects returns client rows for the owner", async () => {
    vi.mocked(prisma.canvasPlaygroundProject.findMany).mockResolvedValue([
      {
        id: "p1",
        ownerId,
        name: "Demo apartment",
        revision: 0,
        snapshot: null,
        blankScene: false,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-02T00:00:00.000Z"),
      },
    ] as never);

    const rows = await listProjects(ownerId);
    expect(rows).toEqual([
      {
        id: "p1",
        name: "Demo apartment",
        updated: "2026-01-02T00:00:00.000Z",
      },
    ]);
    expect(prisma.canvasPlaygroundProject.findMany).toHaveBeenCalledWith({
      where: { ownerId },
      orderBy: { updatedAt: "desc" },
    });
  });

  it("createProject defaults to blank scene", async () => {
    vi.mocked(prisma.canvasPlaygroundProject.create).mockResolvedValue({
      id: "new-id",
      ownerId,
      name: "My room",
      revision: 0,
      snapshot: null,
      blankScene: true,
      createdAt: new Date(),
      updatedAt: new Date("2026-01-03T00:00:00.000Z"),
    } as never);

    const row = await createProject(ownerId, "My room");
    expect(row.blankScene).toBe(true);
    expect(prisma.canvasPlaygroundProject.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          ownerId,
          name: "My room",
          blankScene: true,
        }),
      }),
    );
  });

  it("ensureStarterProject seeds blank + demo when missing", async () => {
    vi.mocked(prisma.canvasPlaygroundProject.findMany).mockResolvedValue([]);
    vi.mocked(prisma.canvasPlaygroundProject.create)
      .mockResolvedValueOnce({
        id: "blank-id",
        ownerId,
        name: "Blank Canvas",
        revision: 0,
        snapshot: null,
        blankScene: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as never)
      .mockResolvedValueOnce({
        id: "demo-id",
        ownerId,
        name: "Demo apartment",
        revision: 0,
        snapshot: null,
        blankScene: false,
        createdAt: new Date(),
        updatedAt: new Date("2026-01-04T00:00:00.000Z"),
      } as never);

    const demo = await ensureStarterProject(ownerId);
    expect(demo.id).toBe("demo-id");
    expect(demo.name).toBe("Demo apartment");
    expect(prisma.canvasPlaygroundProject.create).toHaveBeenCalledTimes(2);
  });
});
