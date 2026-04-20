-- Phase 6C: execution orchestration — lifecycle, tasks, blockers, executionState JSON

CREATE TYPE "ProjectExecutionLifecycle" AS ENUM ('not_started', 'planning', 'in_progress', 'blocked', 'ready_handoff', 'completed');
CREATE TYPE "ProjectExecutionTaskStatus" AS ENUM ('open', 'in_progress', 'done', 'cancelled');
CREATE TYPE "ProjectExecutionTaskPriority" AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE "ProjectBlockerStatus" AS ENUM ('active', 'resolved');

ALTER TABLE "Project" ADD COLUMN "executionLifecycle" "ProjectExecutionLifecycle" NOT NULL DEFAULT 'not_started';
ALTER TABLE "Project" ADD COLUMN "executionState" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "Project" ADD COLUMN "executionNotes" TEXT;

CREATE TABLE "ProjectExecutionBlocker" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "ProjectBlockerStatus" NOT NULL DEFAULT 'active',
    "notes" TEXT,
    "resolutionSuggestion" TEXT,
    "resolutionNotes" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "linkedConstraintKey" TEXT,
    "source" TEXT NOT NULL DEFAULT 'user',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectExecutionBlocker_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProjectExecutionTask" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "ProjectExecutionTaskStatus" NOT NULL DEFAULT 'open',
    "priority" "ProjectExecutionTaskPriority" NOT NULL DEFAULT 'medium',
    "linkedBlockerId" TEXT,
    "linkedShortlistItemId" TEXT,
    "linkedConstraintLabel" TEXT,
    "sourceRecommendationId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectExecutionTask_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProjectExecutionBlocker_projectId_status_idx" ON "ProjectExecutionBlocker"("projectId", "status");
CREATE INDEX "ProjectExecutionBlocker_projectId_updatedAt_idx" ON "ProjectExecutionBlocker"("projectId", "updatedAt" DESC);

CREATE INDEX "ProjectExecutionTask_projectId_status_idx" ON "ProjectExecutionTask"("projectId", "status");
CREATE INDEX "ProjectExecutionTask_projectId_updatedAt_idx" ON "ProjectExecutionTask"("projectId", "updatedAt" DESC);

ALTER TABLE "ProjectExecutionBlocker" ADD CONSTRAINT "ProjectExecutionBlocker_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProjectExecutionTask" ADD CONSTRAINT "ProjectExecutionTask_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectExecutionTask" ADD CONSTRAINT "ProjectExecutionTask_linkedBlockerId_fkey" FOREIGN KEY ("linkedBlockerId") REFERENCES "ProjectExecutionBlocker"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProjectExecutionTask" ADD CONSTRAINT "ProjectExecutionTask_linkedShortlistItemId_fkey" FOREIGN KEY ("linkedShortlistItemId") REFERENCES "ShortlistItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
