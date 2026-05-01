import type { Prisma, PrismaClient } from "@prisma/client";
import { ProjectEventType, ProjectTimelineKind } from "@prisma/client";
import { PROJECT_IN_APP_NOTIFICATION_COPY } from "@/lib/eva/projects/summary-constants";

/** Map legacy timeline kind → canonical event type (single source for writes + backfill alignment). */
export function timelineKindToEventType(
  kind: ProjectTimelineKind,
): ProjectEventType {
  switch (kind) {
    case ProjectTimelineKind.preferred_direction_updated:
      return ProjectEventType.preferred_direction_changed;
    case ProjectTimelineKind.invitation_sent:
      return ProjectEventType.invitation_sent;
    case ProjectTimelineKind.member_joined:
      return ProjectEventType.member_joined;
    case ProjectTimelineKind.member_removed:
      return ProjectEventType.member_removed;
    case ProjectTimelineKind.role_changed:
      return ProjectEventType.role_changed;
    case ProjectTimelineKind.shortlist_updated:
      return ProjectEventType.shortlist_updated;
    case ProjectTimelineKind.blocker_resolved:
      return ProjectEventType.blocker_resolved;
    case ProjectTimelineKind.execution_lifecycle_changed:
      return ProjectEventType.execution_lifecycle_changed;
    case ProjectTimelineKind.comment_created:
      return ProjectEventType.comment_created;
    case ProjectTimelineKind.comment_resolved:
      return ProjectEventType.comment_resolved;
    case ProjectTimelineKind.approval_updated:
      return ProjectEventType.approval_updated;
    default:
      return ProjectEventType.comment_created;
  }
}

/** Notification-worthy types only — must match real `recordProjectEvent` / `appendProjectTimelineEvent` usage. */
const NOTIFY_EVENT_TYPES = new Set<ProjectEventType>([
  ProjectEventType.approval_requested,
  ProjectEventType.approval_granted,
  ProjectEventType.approval_rejected,
  ProjectEventType.comment_created,
  ProjectEventType.comment_resolved,
  ProjectEventType.blocker_resolved,
  ProjectEventType.preferred_direction_changed,
  ProjectEventType.handoff_sent,
  ProjectEventType.item_status_changed,
  ProjectEventType.substitution_made,
]);

/** Maps precise `ProjectEventType` to legacy `ProjectTimelineKind` bucket for the existing column. */
export function eventTypeToLegacyKind(
  t: ProjectEventType,
): ProjectTimelineKind {
  switch (t) {
    case ProjectEventType.preferred_direction_changed:
    case ProjectEventType.preferred_direction_updated:
      return ProjectTimelineKind.preferred_direction_updated;
    case ProjectEventType.shortlist_updated:
    case ProjectEventType.shortlist_item_added:
    case ProjectEventType.shortlist_item_removed:
    case ProjectEventType.item_status_changed:
    case ProjectEventType.substitution_made:
      return ProjectTimelineKind.shortlist_updated;
    case ProjectEventType.blocker_resolved:
      return ProjectTimelineKind.blocker_resolved;
    case ProjectEventType.blocker_added:
      return ProjectTimelineKind.execution_lifecycle_changed;
    case ProjectEventType.execution_task_created:
    case ProjectEventType.execution_task_updated:
    case ProjectEventType.execution_lifecycle_changed:
    case ProjectEventType.project_created:
    case ProjectEventType.execution_package_updated:
    case ProjectEventType.handoff_sent:
      return ProjectTimelineKind.execution_lifecycle_changed;
    case ProjectEventType.approval_requested:
    case ProjectEventType.approval_granted:
    case ProjectEventType.approval_rejected:
    case ProjectEventType.approval_updated:
      return ProjectTimelineKind.approval_updated;
    case ProjectEventType.comment_added:
    case ProjectEventType.comment_created:
      return ProjectTimelineKind.comment_created;
    case ProjectEventType.comment_resolved:
      return ProjectTimelineKind.comment_resolved;
    case ProjectEventType.invitation_sent:
      return ProjectTimelineKind.invitation_sent;
    case ProjectEventType.member_joined:
      return ProjectTimelineKind.member_joined;
    case ProjectEventType.member_removed:
      return ProjectTimelineKind.member_removed;
    case ProjectEventType.role_changed:
      return ProjectTimelineKind.role_changed;
    case ProjectEventType.studio_playground_snapshot_saved:
      return ProjectTimelineKind.execution_lifecycle_changed;
    default:
      return ProjectTimelineKind.execution_lifecycle_changed;
  }
}

function notificationCopy(
  eventType: ProjectEventType,
  label: string,
): { title: string; body: string; category: string } {
  const category = PROJECT_IN_APP_NOTIFICATION_COPY.categoryProject;
  const c = PROJECT_IN_APP_NOTIFICATION_COPY;
  switch (eventType) {
    case ProjectEventType.approval_requested:
      return { title: c.approvalRequested, body: label, category };
    case ProjectEventType.approval_granted:
      return { title: c.approvalGranted, body: label, category };
    case ProjectEventType.approval_rejected:
      return { title: c.approvalRejected, body: label, category };
    case ProjectEventType.comment_created:
    case ProjectEventType.comment_added:
      return { title: c.newReviewComment, body: label, category };
    case ProjectEventType.comment_resolved:
      return { title: c.commentResolved, body: label, category };
    case ProjectEventType.blocker_resolved:
      return { title: c.blockerResolved, body: label, category };
    case ProjectEventType.preferred_direction_changed:
      return { title: c.preferredDirectionUpdated, body: label, category };
    case ProjectEventType.execution_package_updated:
      return { title: c.executionPackageUpdated, body: label, category };
    case ProjectEventType.handoff_sent:
      return { title: c.handoffRecorded, body: label, category };
    case ProjectEventType.item_status_changed:
      return { title: c.itemStatusUpdated, body: label, category };
    case ProjectEventType.substitution_made:
      return { title: c.substitutionRecorded, body: label, category };
    default:
      return { title: c.projectUpdateFallback, body: label, category };
  }
}

async function fanOutInAppNotifications(
  db: Pick<PrismaClient, "project" | "inAppNotification">,
  input: {
    projectId: string;
    actorUserId: string | null;
    eventType: ProjectEventType;
    timelineEventId: string;
    label: string;
  },
): Promise<void> {
  if (!NOTIFY_EVENT_TYPES.has(input.eventType)) return;

  const project = await db.project.findUnique({
    where: { id: input.projectId },
    select: {
      userId: true,
      members: {
        where: { status: "active" },
        select: { userId: true },
      },
    },
  });
  if (!project) return;

  const recipientIds = new Set<string>([
    project.userId,
    ...project.members.map((m) => m.userId),
  ]);
  if (input.actorUserId) {
    recipientIds.delete(input.actorUserId);
  }

  const copy = notificationCopy(input.eventType, input.label);

  if (recipientIds.size === 0) return;

  await Promise.all(
    [...recipientIds].map((userId) =>
      db.inAppNotification.create({
        data: {
          userId,
          projectId: input.projectId,
          sourceTimelineEventId: input.timelineEventId,
          category: copy.category,
          title: copy.title,
          body: copy.body,
        },
      }),
    ),
  );
}

/**
 * Inserts a timeline row with canonical `eventType` and optional targeting; fans out in-app notifications when appropriate.
 */
export async function recordProjectEvent(
  db: PrismaClient | Prisma.TransactionClient,
  input: {
    projectId: string;
    actorUserId: string | null;
    eventType: ProjectEventType;
    /** When set (e.g. from `appendProjectTimelineEvent`), must match `eventType` semantics. */
    legacyKind?: ProjectTimelineKind;
    targetType?: string | null;
    targetId?: string | null;
    summary?: string | null;
    label: string;
    metadata?: Prisma.InputJsonValue;
  },
): Promise<{ id: string }> {
  const kind = input.legacyKind ?? eventTypeToLegacyKind(input.eventType);

  const row = await db.projectTimelineEvent.create({
    data: {
      projectId: input.projectId,
      actorUserId: input.actorUserId,
      kind,
      eventType: input.eventType,
      targetType: input.targetType ?? undefined,
      targetId: input.targetId ?? undefined,
      summary: input.summary ?? input.label.slice(0, 2000),
      label: input.label.slice(0, 8000),
      metadata: input.metadata,
    },
  });

  await fanOutInAppNotifications(db, {
    projectId: input.projectId,
    actorUserId: input.actorUserId,
    eventType: input.eventType,
    timelineEventId: row.id,
    label: input.label,
  });

  return { id: row.id };
}
