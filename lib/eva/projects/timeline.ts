import type { Prisma, PrismaClient } from "@prisma/client";
import type { ProjectEventType, ProjectTimelineKind } from "@prisma/client";
import {
  recordProjectEvent,
  timelineKindToEventType,
} from "@/lib/eva/projects/project-events";

/**
 * Append a project timeline / audit event (Phase 6D row + Phase 7 canonical `eventType`).
 * Prefer `recordProjectEvent` when you are not carrying a legacy `kind` bucket.
 */
export async function appendProjectTimelineEvent(
  db: PrismaClient | Prisma.TransactionClient,
  input: {
    projectId: string;
    actorUserId: string | null;
    kind: ProjectTimelineKind;
    /** Override canonical type when it is more specific than `kind`. */
    eventType?: ProjectEventType;
    targetType?: string | null;
    targetId?: string | null;
    summary?: string | null;
    label: string;
    metadata?: Prisma.InputJsonValue;
  },
): Promise<void> {
  await recordProjectEvent(db, {
    projectId: input.projectId,
    actorUserId: input.actorUserId,
    eventType: input.eventType ?? timelineKindToEventType(input.kind),
    legacyKind: input.kind,
    targetType: input.targetType,
    targetId: input.targetId,
    summary: input.summary,
    label: input.label,
    metadata: input.metadata,
  });
}
