-- Phase 7: project events (canonical eventType), item external lifecycle, packet sends, in-app notifications

CREATE TYPE "ProjectEventType" AS ENUM (
  'project_created',
  'preferred_direction_changed',
  'preferred_direction_updated',
  'shortlist_item_added',
  'shortlist_item_removed',
  'shortlist_updated',
  'blocker_added',
  'blocker_resolved',
  'execution_task_created',
  'execution_task_updated',
  'execution_lifecycle_changed',
  'approval_requested',
  'approval_granted',
  'approval_rejected',
  'approval_updated',
  'comment_added',
  'comment_created',
  'comment_resolved',
  'execution_package_updated',
  'handoff_sent',
  'item_status_changed',
  'substitution_made',
  'invitation_sent',
  'member_joined',
  'member_removed',
  'role_changed'
);

CREATE TYPE "ShortlistItemExternalLifecycle" AS ENUM (
  'proposed',
  'shortlisted',
  'approved',
  'sourcing',
  'quoted',
  'ordered',
  'delivered',
  'unavailable',
  'replaced',
  'rejected'
);

CREATE TYPE "ProjectPacketKind" AS ENUM (
  'project_summary',
  'approval_review',
  'execution_package'
);

CREATE TYPE "ProjectPacketDeliveryChannel" AS ENUM (
  'recorded_download',
  'email',
  'link_share'
);

ALTER TABLE "ProjectTimelineEvent" ADD COLUMN "eventType" "ProjectEventType";
ALTER TABLE "ProjectTimelineEvent" ADD COLUMN "targetType" TEXT;
ALTER TABLE "ProjectTimelineEvent" ADD COLUMN "targetId" TEXT;
ALTER TABLE "ProjectTimelineEvent" ADD COLUMN "summary" TEXT;

UPDATE "ProjectTimelineEvent" SET "eventType" = (
  CASE "kind"::text
    WHEN 'invitation_sent' THEN 'invitation_sent'
    WHEN 'member_joined' THEN 'member_joined'
    WHEN 'member_removed' THEN 'member_removed'
    WHEN 'role_changed' THEN 'role_changed'
    WHEN 'preferred_direction_updated' THEN 'preferred_direction_changed'
    WHEN 'shortlist_updated' THEN 'shortlist_updated'
    WHEN 'blocker_resolved' THEN 'blocker_resolved'
    WHEN 'execution_lifecycle_changed' THEN 'execution_lifecycle_changed'
    WHEN 'comment_created' THEN 'comment_created'
    WHEN 'comment_resolved' THEN 'comment_resolved'
    WHEN 'approval_updated' THEN 'approval_updated'
    ELSE 'comment_created'
  END
)::"ProjectEventType";

ALTER TABLE "ProjectTimelineEvent" ALTER COLUMN "eventType" SET NOT NULL;

CREATE INDEX "ProjectTimelineEvent_projectId_eventType_idx" ON "ProjectTimelineEvent"("projectId", "eventType");

ALTER TABLE "ShortlistItem" ADD COLUMN "externalLifecycle" "ShortlistItemExternalLifecycle" NOT NULL DEFAULT 'shortlisted';

CREATE TABLE "ProjectPacketSend" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "kind" "ProjectPacketKind" NOT NULL,
    "channel" "ProjectPacketDeliveryChannel" NOT NULL,
    "recipientEmail" TEXT,
    "sentByUserId" TEXT,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "stateSnapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProjectPacketSend_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InAppNotification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "projectId" TEXT,
    "sourceTimelineEventId" TEXT,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InAppNotification_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProjectPacketSend_projectId_sentAt_idx" ON "ProjectPacketSend"("projectId", "sentAt" DESC);

CREATE INDEX "InAppNotification_userId_readAt_createdAt_idx" ON "InAppNotification"("userId", "readAt", "createdAt" DESC);
CREATE INDEX "InAppNotification_projectId_createdAt_idx" ON "InAppNotification"("projectId", "createdAt" DESC);

ALTER TABLE "ProjectPacketSend" ADD CONSTRAINT "ProjectPacketSend_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectPacketSend" ADD CONSTRAINT "ProjectPacketSend_sentByUserId_fkey" FOREIGN KEY ("sentByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "InAppNotification" ADD CONSTRAINT "InAppNotification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InAppNotification" ADD CONSTRAINT "InAppNotification_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InAppNotification" ADD CONSTRAINT "InAppNotification_sourceTimelineEventId_fkey" FOREIGN KEY ("sourceTimelineEventId") REFERENCES "ProjectTimelineEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
