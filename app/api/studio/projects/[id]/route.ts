import { z } from "zod";
import { prisma } from "@/lib/eva/db";
import {
  requireCanonicalProjectOwner,
  requireProjectEditor,
} from "@/lib/eva/projects/access";
import { prismaRowToStudioProject } from "@/lib/studio/projects/map-prisma-project";
import { withStudioAuthParams } from "@/lib/studio/server/auth";

export const dynamic = "force-dynamic";

const PatchBodySchema = z.object({
  name: z.string().min(1).max(200),
});

export const PATCH = withStudioAuthParams<{ id: string }>(
  "studio:projects:patch",
  async (req, ctx, params) => {
    const { userId } = ctx;
    const { id } = params;
    let body: unknown = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }
    const parsed = PatchBodySchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: "Invalid body" }, { status: 400 });
    }

    const gate = await requireProjectEditor(id, userId);
    if (gate.error || !gate.access) {
      return Response.json(
        { error: gate.error ?? "Forbidden" },
        { status: gate.status },
      );
    }

    const updated = await prisma.project.update({
      where: { id },
      data: { title: parsed.data.name.trim() },
      select: { id: true, title: true, updatedAt: true },
    });

    return Response.json({ project: prismaRowToStudioProject(updated) });
  },
);

export const DELETE = withStudioAuthParams<{ id: string }>(
  "studio:projects:delete",
  async (_req, ctx, params) => {
    const { userId } = ctx;
    const { id } = params;

    const gate = await requireCanonicalProjectOwner(id, userId);
    if (gate.error || !gate.project) {
      return Response.json(
        { error: gate.error ?? "Not found" },
        { status: gate.status },
      );
    }

    await prisma.project.delete({ where: { id } });
    return Response.json({ ok: true });
  },
);
