import { z } from "zod";
import { prisma } from "@/server/db";
import { recordSecurityEvent } from "@/server/auth/security-events";
import { err, ok, type ServiceResult } from "@/server/result";
import { authorizeProjectAssociation } from "@/server/image-generation/image-generation-authorization";
import { assertRowQuota, maxInspirationItemsPerUser } from "@/server/quota";

const IMAGE_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);

type InspirationError =
  | "validation"
  | "not_found"
  | "forbidden"
  | "duplicate"
  | "unsupported_source"
  | "rate_limited";

export type InspirationDto = {
  id: string;
  title: string | null;
  note: string | null;
  roomLabel: string | null;
  colors: string[];
  materials: string[];
  projectId: string | null;
  projectName: string | null;
  uploadId: string | null;
  imageGenerationId: string | null;
  source: "generated" | "uploaded";
  filename: string | null;
  mimeType: string | null;
  createdAt: string;
  updatedAt: string;
};

function parseJsonList(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const value = JSON.parse(raw) as unknown;
    if (!Array.isArray(value)) return [];
    return value
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 12);
  } catch {
    return [];
  }
}

function toDto(row: {
  id: string;
  title: string | null;
  note: string | null;
  roomLabel: string | null;
  colorsJson: string | null;
  materialsJson: string | null;
  projectId: string | null;
  uploadId: string | null;
  imageGenerationId: string | null;
  createdAt: Date;
  updatedAt: Date;
  project: { id: string; name: string } | null;
  upload: {
    id: string;
    filename: string;
    mimeType: string;
    source: string;
  } | null;
  imageGeneration: {
    id: string;
    outputUploadId: string | null;
    outputUpload: {
      id: string;
      filename: string;
      mimeType: string;
    } | null;
  } | null;
}): InspirationDto {
  const generatedUpload = row.imageGeneration?.outputUpload ?? null;
  const upload = row.upload ?? generatedUpload;
  const source: "generated" | "uploaded" = row.imageGenerationId
    ? "generated"
    : "uploaded";
  return {
    id: row.id,
    title: row.title,
    note: row.note,
    roomLabel: row.roomLabel,
    colors: parseJsonList(row.colorsJson),
    materials: parseJsonList(row.materialsJson),
    projectId: row.projectId,
    projectName: row.project?.name ?? null,
    uploadId: upload?.id ?? row.uploadId,
    imageGenerationId: row.imageGenerationId,
    source,
    filename: upload?.filename ?? null,
    mimeType: upload?.mimeType ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

const include = {
  project: { select: { id: true, name: true } },
  upload: {
    select: { id: true, filename: true, mimeType: true, source: true },
  },
  imageGeneration: {
    select: {
      id: true,
      outputUploadId: true,
      outputUpload: {
        select: { id: true, filename: true, mimeType: true },
      },
    },
  },
} as const;

const createSchema = z
  .object({
    uploadId: z.string().cuid().optional().nullable(),
    imageGenerationId: z.string().cuid().optional().nullable(),
    title: z.string().max(120).optional().nullable(),
    note: z.string().max(2000).optional().nullable(),
    roomLabel: z.string().max(80).optional().nullable(),
    projectId: z.string().cuid().optional().nullable(),
    colors: z.array(z.string().max(40)).max(12).optional(),
    materials: z.array(z.string().max(40)).max(12).optional(),
    /** Recommendation → board save without an image asset. */
    noteOnly: z.boolean().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.noteOnly) {
      if (!value.title?.trim() && !value.note?.trim()) {
        ctx.addIssue({
          code: "custom",
          message: "Note-only items need a title or note.",
        });
      }
      return;
    }
    const hasUpload = Boolean(value.uploadId);
    const hasGeneration = Boolean(value.imageGenerationId);
    if (hasUpload === hasGeneration) {
      ctx.addIssue({
        code: "custom",
        message: "Provide either an upload or a ready generation.",
      });
    }
  });

const updateSchema = z.object({
  title: z.string().max(120).optional().nullable(),
  note: z.string().max(2000).optional().nullable(),
  roomLabel: z.string().max(80).optional().nullable(),
  projectId: z.string().cuid().optional().nullable(),
  colors: z.array(z.string().max(40)).max(12).optional(),
  materials: z.array(z.string().max(40)).max(12).optional(),
});

async function audit(
  userId: string,
  kind: string,
  meta?: Record<string, string | null | undefined>,
) {
  await recordSecurityEvent({
    userId,
    kind,
    meta: meta ? JSON.stringify(meta) : null,
  });
}

export async function listInspirationItems(
  userId: string,
  filters: {
    projectId?: string | null;
    source?: "generated" | "uploaded" | null;
    cursor?: string | null;
    take?: number;
  } = {},
) {
  const take = Math.min(Math.max(filters.take ?? 20, 1), 50);
  const rows = await prisma.inspirationItem.findMany({
    where: {
      userId,
      ...(filters.projectId ? { projectId: filters.projectId } : {}),
      ...(filters.source === "generated"
        ? { imageGenerationId: { not: null } }
        : filters.source === "uploaded"
          ? { uploadId: { not: null }, imageGenerationId: null }
          : {}),
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: take + 1,
    ...(filters.cursor ? { cursor: { id: filters.cursor }, skip: 1 } : {}),
    include,
  });
  const hasMore = rows.length > take;
  const items = hasMore ? rows.slice(0, take) : rows;
  return {
    items: items.map(toDto),
    nextCursor: hasMore ? items[items.length - 1]!.id : null,
  };
}

export async function createInspirationItem(
  userId: string,
  input: unknown,
): Promise<ServiceResult<InspirationDto, InspirationError>> {
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) {
    return err("validation", "Provide either an upload or a ready generation.");
  }

  const quota = await assertRowQuota(
    () => prisma.inspirationItem.count({ where: { userId } }),
    maxInspirationItemsPerUser(),
    "inspiration items",
  );
  if (!quota.ok) return quota;

  const projectAuth = await authorizeProjectAssociation(
    userId,
    parsed.data.projectId,
  );
  if (!projectAuth.ok) {
    return err("forbidden", projectAuth.message);
  }

  let uploadId: string | null = null;
  let imageGenerationId: string | null = null;
  let defaultTitle: string | null = null;

  if (parsed.data.uploadId) {
    const upload = await prisma.upload.findFirst({
      where: { id: parsed.data.uploadId, userId },
    });
    if (!upload) return err("not_found", "Upload not found.");
    if (!IMAGE_MIME.has(upload.mimeType)) {
      return err(
        "unsupported_source",
        "Only image uploads can be saved to Inspiration.",
      );
    }
    const existing = await prisma.inspirationItem.findFirst({
      where: { userId, uploadId: upload.id },
    });
    if (existing) {
      return err(
        "duplicate",
        "This upload is already on your Inspiration Board.",
      );
    }
    uploadId = upload.id;
    defaultTitle = upload.filename;
  } else if (parsed.data.imageGenerationId) {
    const generation = await prisma.imageGeneration.findFirst({
      where: { id: parsed.data.imageGenerationId, userId },
      include: { outputUpload: true },
    });
    if (!generation) return err("not_found", "Generation not found.");
    if (generation.status !== "ready" || !generation.outputUploadId) {
      return err(
        "unsupported_source",
        "Only ready generations can be saved to Inspiration.",
      );
    }
    const existing = await prisma.inspirationItem.findFirst({
      where: { userId, imageGenerationId: generation.id },
    });
    if (existing) {
      return err(
        "duplicate",
        "This generation is already on your Inspiration Board.",
      );
    }
    imageGenerationId = generation.id;
    defaultTitle = generation.prompt.slice(0, 80);
  }

  const created = await prisma.inspirationItem.create({
    data: {
      userId,
      projectId: projectAuth.value.projectId,
      uploadId,
      imageGenerationId,
      title: parsed.data.title?.trim() || defaultTitle,
      note: parsed.data.note?.trim() || null,
      roomLabel: parsed.data.roomLabel?.trim() || null,
      colorsJson: JSON.stringify(parsed.data.colors ?? []),
      materialsJson: JSON.stringify(parsed.data.materials ?? []),
    },
    include,
  });

  await audit(userId, "inspiration_saved", { itemId: created.id });
  return ok(toDto(created));
}

export async function updateInspirationItem(
  userId: string,
  itemId: string,
  input: unknown,
): Promise<ServiceResult<InspirationDto, InspirationError>> {
  const existing = await prisma.inspirationItem.findFirst({
    where: { id: itemId, userId },
  });
  if (!existing) return err("not_found", "Inspiration item not found.");

  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) {
    return err("validation", "Check the highlighted fields.");
  }

  let projectId = existing.projectId;
  if ("projectId" in parsed.data) {
    const projectAuth = await authorizeProjectAssociation(
      userId,
      parsed.data.projectId,
    );
    if (!projectAuth.ok) {
      return err("forbidden", projectAuth.message);
    }
    projectId = projectAuth.value.projectId;
  }

  const updated = await prisma.inspirationItem.update({
    where: { id: itemId },
    data: {
      projectId,
      ...(parsed.data.title !== undefined
        ? { title: parsed.data.title?.trim() || null }
        : {}),
      ...(parsed.data.note !== undefined
        ? { note: parsed.data.note?.trim() || null }
        : {}),
      ...(parsed.data.roomLabel !== undefined
        ? { roomLabel: parsed.data.roomLabel?.trim() || null }
        : {}),
      ...(parsed.data.colors
        ? { colorsJson: JSON.stringify(parsed.data.colors) }
        : {}),
      ...(parsed.data.materials
        ? { materialsJson: JSON.stringify(parsed.data.materials) }
        : {}),
    },
    include,
  });

  return ok(toDto(updated));
}

export async function deleteInspirationItem(
  userId: string,
  itemId: string,
): Promise<ServiceResult<{ deleted: true }, InspirationError>> {
  const existing = await prisma.inspirationItem.findFirst({
    where: { id: itemId, userId },
  });
  if (!existing) return err("not_found", "Inspiration item not found.");
  await prisma.inspirationItem.delete({ where: { id: itemId } });
  await audit(userId, "inspiration_removed", { itemId });
  return ok({ deleted: true });
}
