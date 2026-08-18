import { prisma } from "@/server/db";
import { err, ok, type ServiceResult } from "@/server/result";

export async function authorizeProjectAssociation(
  userId: string,
  projectId: string | null | undefined,
): Promise<ServiceResult<{ projectId: string | null }, "forbidden">> {
  if (!projectId) return ok({ projectId: null });
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      OR: [
        { ownerId: userId },
        {
          members: {
            some: {
              userId,
              role: { in: ["owner", "editor"] },
            },
          },
        },
      ],
    },
    select: { id: true },
  });
  if (!project) {
    return err("forbidden", "Project not found or inaccessible.");
  }
  return ok({ projectId: project.id });
}
