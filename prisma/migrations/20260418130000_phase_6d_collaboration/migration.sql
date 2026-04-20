-- Phase 6D: collaboration, review, approvals, timeline

CREATE TYPE "ProjectMemberStatus" AS ENUM ('active', 'removed');
CREATE TYPE "ProjectInviteStatus" AS ENUM ('pending', 'accepted', 'revoked', 'expired');
CREATE TYPE "ProjectCommentTargetType" AS ENUM ('project', 'recommendation', 'shortlist_item', 'artifact', 'execution_task', 'execution_blocker');
CREATE TYPE "ProjectApprovalTargetType" AS ENUM ('preferred_direction', 'shortlist', 'execution_package', 'handoff_export');
CREATE TYPE "ProjectApprovalDecisionStatus" AS ENUM ('pending', 'approved', 'rejected', 'revoked');
CREATE TYPE "ProjectTimelineKind" AS ENUM (
  'invitation_sent',
  'member_joined',
  'member_removed',
  'role_changed',
  'preferred_direction_updated',
  'shortlist_updated',
  'blocker_resolved',
  'execution_lifecycle_changed',
  'comment_created',
  'comment_resolved',
  'approval_updated'
);

ALTER TABLE "ProjectMember" ADD COLUMN "status" "ProjectMemberStatus" NOT NULL DEFAULT 'active';
ALTER TABLE "ProjectMember" ADD COLUMN "invitedByUserId" TEXT;

ALTER TABLE "ProjectMember" ADD CONSTRAINT "ProjectMember_invitedByUserId_fkey" FOREIGN KEY ("invitedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "ProjectMember_projectId_status_idx" ON "ProjectMember"("projectId", "status");

CREATE TABLE "ProjectInvitation" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "MemberRole" NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "status" "ProjectInviteStatus" NOT NULL DEFAULT 'pending',
    "invitedByUserId" TEXT NOT NULL,
    "invitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "acceptedUserId" TEXT,

    CONSTRAINT "ProjectInvitation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProjectInvitation_tokenHash_key" ON "ProjectInvitation"("tokenHash");
CREATE INDEX "ProjectInvitation_projectId_status_idx" ON "ProjectInvitation"("projectId", "status");
CREATE INDEX "ProjectInvitation_email_idx" ON "ProjectInvitation"("email");

ALTER TABLE "ProjectInvitation" ADD CONSTRAINT "ProjectInvitation_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectInvitation" ADD CONSTRAINT "ProjectInvitation_invitedByUserId_fkey" FOREIGN KEY ("invitedByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ProjectComment" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "authorUserId" TEXT NOT NULL,
    "targetType" "ProjectCommentTargetType" NOT NULL,
    "targetId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "parentId" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "resolverUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectComment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProjectComment_projectId_targetType_targetId_idx" ON "ProjectComment"("projectId", "targetType", "targetId");
CREATE INDEX "ProjectComment_projectId_createdAt_idx" ON "ProjectComment"("projectId", "createdAt" DESC);

ALTER TABLE "ProjectComment" ADD CONSTRAINT "ProjectComment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectComment" ADD CONSTRAINT "ProjectComment_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectComment" ADD CONSTRAINT "ProjectComment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ProjectComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ProjectApproval" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "targetType" "ProjectApprovalTargetType" NOT NULL,
    "targetId" TEXT NOT NULL,
    "status" "ProjectApprovalDecisionStatus" NOT NULL DEFAULT 'pending',
    "note" TEXT,
    "createdByUserId" TEXT,
    "decidedByUserId" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectApproval_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProjectApproval_projectId_targetType_targetId_key" ON "ProjectApproval"("projectId", "targetType", "targetId");
CREATE INDEX "ProjectApproval_projectId_status_idx" ON "ProjectApproval"("projectId", "status");

ALTER TABLE "ProjectApproval" ADD CONSTRAINT "ProjectApproval_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ProjectTimelineEvent" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "actorUserId" TEXT,
    "kind" "ProjectTimelineKind" NOT NULL,
    "label" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectTimelineEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProjectTimelineEvent_projectId_createdAt_idx" ON "ProjectTimelineEvent"("projectId", "createdAt" DESC);

ALTER TABLE "ProjectTimelineEvent" ADD CONSTRAINT "ProjectTimelineEvent_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
