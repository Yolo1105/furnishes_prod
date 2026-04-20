import { auth } from "@/auth";
import { UserRole } from "@prisma/client";
import { prisma } from "@/lib/eva/db";
import { apiError, ErrorCodes } from "@/lib/eva/api/error";
import { PlaybookGraphBodySchema } from "@/lib/eva/playbook/graph-schema";
import { invalidatePlaybookCache } from "@/lib/eva/playbook/runtime";

export const dynamic = "force-dynamic";

/**
 * Playbook graph is sensitive ops/config. Require a signed-in admin with role
 * verified against the database (not JWT alone).
 */
async function requirePlaybookAdmin(): Promise<Response | { ok: true }> {
  const session = await auth();
  if (!session?.user?.id) {
    return apiError(ErrorCodes.UNAUTHORIZED, "Unauthorized", 401);
  }
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (user?.role !== UserRole.admin) {
    return apiError(ErrorCodes.FORBIDDEN, "Forbidden", 403);
  }
  return { ok: true };
}

export async function GET() {
  const gate = await requirePlaybookAdmin();
  if (gate instanceof Response) return gate;

  const row = await prisma.playbook.findFirst({
    orderBy: { updatedAt: "desc" },
  });
  if (!row) {
    return apiError(ErrorCodes.NOT_FOUND, "No playbook found", 404);
  }
  const nodes = row.nodes as unknown[];
  const edges = row.edges as unknown[];
  return Response.json({
    nodes: Array.isArray(nodes) ? nodes : [],
    edges: Array.isArray(edges) ? edges : [],
  });
}

export async function PUT(req: Request) {
  const gate = await requirePlaybookAdmin();
  if (gate instanceof Response) return gate;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError(ErrorCodes.VALIDATION_ERROR, "Invalid JSON body", 400);
  }
  const parsed = PlaybookGraphBodySchema.safeParse(body);
  if (!parsed.success) {
    return apiError(
      ErrorCodes.VALIDATION_ERROR,
      "Invalid playbook graph",
      400,
      parsed.error.flatten(),
    );
  }
  const { nodes, edges } = parsed.data;
  const row = await prisma.playbook.findFirst({
    orderBy: { updatedAt: "desc" },
  });
  if (row) {
    await prisma.playbook.update({
      where: { id: row.id },
      data: { nodes, edges },
    });
  } else {
    await prisma.playbook.create({
      data: { nodes, edges },
    });
  }
  invalidatePlaybookCache();
  return Response.json({ ok: true });
}
