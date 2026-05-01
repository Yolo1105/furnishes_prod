import "server-only";

import { ProjectMemberStatus, type Prisma } from "@prisma/client";

/** Projects visible to a user (owner or active member), excluding archived. */
export function accessibleProjectsWhereClause(
  userId: string,
): Prisma.ProjectWhereInput {
  return {
    archivedAt: null,
    OR: [
      { userId },
      {
        members: {
          some: { userId, status: ProjectMemberStatus.active },
        },
      },
    ],
  };
}
