import { ProjectEventType } from "@prisma/client";
import { prisma } from "@/lib/eva/db";
import { recordProjectEvent } from "@/lib/eva/projects/project-events";
import {
  requireProjectEditor,
  requireProjectViewer,
} from "@/lib/eva/projects/access";
import {
  PLAYGROUND_SNAPSHOT_MAX_BYTES,
  PutPlaygroundSnapshotBodySchema,
  parsePersistedEnvelope,
  type PlaygroundPersistedEnvelope,
} from "@/lib/studio/server/playground-persisted-schema";
import { withStudioAuthParams } from "@/lib/studio/server/auth";

export const dynamic = "force-dynamic";

function paramId(params: { id: string | string[] }): string {
  const { id } = params;
  return typeof id === "string" ? id : (id[0] ?? "");
}

export const GET = withStudioAuthParams<{ id: string }>(
  "studio:snapshot:get",
  async (_req, ctx, params) => {
    const id = paramId(params);
    if (!id) {
      return Response.json({ error: "Missing project id" }, { status: 400 });
    }

    const gate = await requireProjectViewer(id, ctx.userId);
    if (gate.error || !gate.access) {
      return Response.json(
        { error: gate.error ?? "Forbidden" },
        { status: gate.status },
      );
    }

    const row = await prisma.project.findUnique({
      where: { id },
      select: { playgroundClientSnapshot: true },
    });
    if (!row) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }

    const raw = row.playgroundClientSnapshot;
    if (raw == null) {
      return Response.json({ revision: null, snapshot: null });
    }

    const parsed = parsePersistedEnvelope(raw);
    if (!parsed.ok) {
      console.warn(
        JSON.stringify({
          event: "playground_snapshot_envelope_invalid",
          projectId: id,
          error: parsed.error,
        }),
      );
      return Response.json({ revision: null, snapshot: null });
    }

    return Response.json({
      revision: parsed.value.revision,
      snapshot: parsed.value.snapshot,
    });
  },
);

function allowsInitialPut(expected: number | null | undefined): boolean {
  return expected === undefined || expected === null || expected === 0;
}

export const PUT = withStudioAuthParams<{ id: string }>(
  "studio:snapshot:put",
  async (req, ctx, params) => {
    const id = paramId(params);
    if (!id) {
      return Response.json({ error: "Missing project id" }, { status: 400 });
    }

    const gate = await requireProjectEditor(id, ctx.userId);
    if (gate.error || !gate.access) {
      return Response.json(
        { error: gate.error ?? "Forbidden" },
        { status: gate.status },
      );
    }

    const text = await req.text();
    if (text.length > PLAYGROUND_SNAPSHOT_MAX_BYTES) {
      return Response.json(
        { error: "Snapshot payload too large" },
        { status: 413 },
      );
    }

    let body: unknown;
    try {
      body = JSON.parse(text) as unknown;
    } catch {
      return Response.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const parsed = PutPlaygroundSnapshotBodySchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: "Invalid body", detail: parsed.error.flatten() },
        { status: 400 },
      );
    }

    if (parsed.data.snapshot.id !== id) {
      return Response.json(
        { error: "snapshot.id must match the project route id" },
        { status: 400 },
      );
    }

    const row = await prisma.project.findUnique({
      where: { id },
      select: { playgroundClientSnapshot: true },
    });
    if (!row) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }

    const expected = parsed.data.expectedRevision;
    const currentRaw = row.playgroundClientSnapshot;

    let nextRevision: number;
    if (currentRaw == null) {
      if (!allowsInitialPut(expected)) {
        return Response.json(
          {
            error:
              "expectedRevision must be omitted, null, or 0 when no server snapshot exists",
          },
          { status: 400 },
        );
      }
      nextRevision = 1;
    } else {
      const currentParsed = parsePersistedEnvelope(currentRaw);
      if (!currentParsed.ok) {
        if (!allowsInitialPut(expected)) {
          return Response.json(
            {
              error:
                "Corrupt server snapshot; send expectedRevision 0 to overwrite",
            },
            { status: 409 },
          );
        }
        nextRevision = 1;
      } else {
        const currentRev = currentParsed.value.revision;
        if (expected !== currentRev) {
          return Response.json(
            {
              error: "Revision mismatch",
              currentRevision: currentRev,
            },
            { status: 409 },
          );
        }
        nextRevision = currentRev + 1;
      }
    }

    const envelope: PlaygroundPersistedEnvelope = {
      revision: nextRevision,
      snapshot: parsed.data.snapshot,
    };

    await prisma.$transaction(async (tx) => {
      await tx.project.update({
        where: { id },
        data: { playgroundClientSnapshot: envelope as object },
      });
      await recordProjectEvent(tx, {
        projectId: id,
        actorUserId: ctx.userId,
        eventType: ProjectEventType.studio_playground_snapshot_saved,
        label: "Playground snapshot saved",
        summary: `Revision ${nextRevision}`,
        metadata: {
          revision: nextRevision,
          schemaVersion: parsed.data.snapshot.schemaVersion,
        },
      });
    });

    return Response.json({ ok: true, revision: nextRevision });
  },
);
