import { randomUUID } from "crypto";
import { prisma } from "@/server/db";
import {
  PLAYGROUND_BLANK_PROJECT_TITLE,
  PLAYGROUND_DEMO_PROJECT_TITLE,
} from "@/shared/canvas/playground-project-titles";
import { type PlaygroundProjectClient } from "./playground-project-types";

function toClient(row: {
  id: string;
  name: string;
  updatedAt: Date;
  blankScene: boolean;
}): PlaygroundProjectClient {
  return {
    id: row.id,
    name: row.name,
    updated: row.updatedAt.toISOString(),
    ...(row.blankScene ? { blankScene: true as const } : {}),
  };
}

export async function listProjects(
  ownerId: string,
): Promise<PlaygroundProjectClient[]> {
  const rows = await prisma.canvasPlaygroundProject.findMany({
    where: { ownerId },
    orderBy: { updatedAt: "desc" },
  });
  return rows.map(toClient);
}

export async function createProject(
  ownerId: string,
  name?: string,
  opts?: { blankScene?: boolean },
): Promise<PlaygroundProjectClient> {
  const blankScene = opts?.blankScene !== false;
  const row = await prisma.canvasPlaygroundProject.create({
    data: {
      id: randomUUID(),
      ownerId,
      name: (name?.trim() || "Untitled Space").slice(0, 200),
      blankScene,
    },
  });
  return toClient(row);
}

/**
 * Ensure Blank Canvas + Demo apartment exist. Returns Demo apartment for focus.
 */
export async function ensureStarterProject(
  ownerId: string,
): Promise<PlaygroundProjectClient> {
  const existing = await prisma.canvasPlaygroundProject.findMany({
    where: { ownerId },
  });

  let blank = existing.find(
    (p) => p.blankScene || p.name === PLAYGROUND_BLANK_PROJECT_TITLE,
  );
  if (!blank) {
    blank = await prisma.canvasPlaygroundProject.create({
      data: {
        id: randomUUID(),
        ownerId,
        name: PLAYGROUND_BLANK_PROJECT_TITLE,
        blankScene: true,
      },
    });
  } else if (!blank.blankScene) {
    blank = await prisma.canvasPlaygroundProject.update({
      where: { id: blank.id },
      data: { blankScene: true },
    });
  }

  let demo = existing.find((p) => p.name === PLAYGROUND_DEMO_PROJECT_TITLE);
  if (!demo) {
    demo = await prisma.canvasPlaygroundProject.create({
      data: {
        id: randomUUID(),
        ownerId,
        name: PLAYGROUND_DEMO_PROJECT_TITLE,
        blankScene: false,
      },
    });
  }

  return toClient(demo);
}

export async function renameProject(
  ownerId: string,
  id: string,
  name: string,
): Promise<PlaygroundProjectClient | null> {
  const current = await prisma.canvasPlaygroundProject.findFirst({
    where: { id, ownerId },
  });
  if (!current) return null;

  const finalName = name.trim().slice(0, 200) || current.name;
  const row = await prisma.canvasPlaygroundProject.update({
    where: { id },
    data: { name: finalName },
  });
  return toClient(row);
}

export async function deleteProject(
  ownerId: string,
  id: string,
): Promise<boolean> {
  const result = await prisma.canvasPlaygroundProject.deleteMany({
    where: { id, ownerId },
  });
  return result.count > 0;
}

export async function getSnapshot(ownerId: string, id: string) {
  const row = await prisma.canvasPlaygroundProject.findFirst({
    where: { id, ownerId },
    select: { revision: true, snapshot: true },
  });
  if (!row) return null;
  if (row.snapshot == null) {
    return { revision: null as number | null, snapshot: null as unknown };
  }
  return { revision: row.revision, snapshot: row.snapshot };
}

export async function putSnapshot(
  ownerId: string,
  id: string,
  snapshot: unknown,
  expectedRevision: number | null | undefined,
): Promise<
  | { ok: true; revision: number }
  | { ok: false; status: number; currentRevision?: number; error: string }
> {
  const current = await prisma.canvasPlaygroundProject.findFirst({
    where: { id, ownerId },
    select: { revision: true },
  });
  if (!current) {
    return { ok: false, status: 404, error: "Not found" };
  }

  const allowsInitial =
    expectedRevision === undefined ||
    expectedRevision === null ||
    expectedRevision === 0;
  if (!allowsInitial && expectedRevision !== current.revision) {
    return {
      ok: false,
      status: 409,
      currentRevision: current.revision,
      error: "Revision conflict",
    };
  }

  const nextRevision = current.revision + 1;
  const updated = await prisma.canvasPlaygroundProject.updateMany({
    where: { id, ownerId, revision: current.revision },
    data: {
      revision: nextRevision,
      snapshot: snapshot as object,
    },
  });
  if (updated.count === 0) {
    const latest = await prisma.canvasPlaygroundProject.findFirst({
      where: { id, ownerId },
      select: { revision: true },
    });
    return {
      ok: false,
      status: 409,
      ...(latest?.revision !== undefined
        ? { currentRevision: latest.revision }
        : {}),
      error: "Revision conflict",
    };
  }
  return { ok: true, revision: nextRevision };
}
