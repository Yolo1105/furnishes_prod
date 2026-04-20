-- Design workflow engine: stages, brief snapshot, active conversation, audit trail.

CREATE TYPE "DesignWorkflowStage" AS ENUM (
  'intake',
  'preference_capture',
  'clarification',
  'recommendation_generation',
  'refinement',
  'decision_handoff'
);

ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "roomType" TEXT;

ALTER TABLE "Project" ADD COLUMN "workflowStage" "DesignWorkflowStage" NOT NULL DEFAULT 'intake';

ALTER TABLE "Project" ADD COLUMN "briefSnapshot" JSONB;

ALTER TABLE "Project" ADD COLUMN "workflowSatisfied" JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE "Project" ADD COLUMN "activeConversationId" TEXT;

CREATE UNIQUE INDEX "Project_activeConversationId_key" ON "Project"("activeConversationId");

ALTER TABLE "Project" ADD CONSTRAINT "Project_activeConversationId_fkey" FOREIGN KEY ("activeConversationId") REFERENCES "Conversation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "ProjectWorkflowEvent" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "fromStage" "DesignWorkflowStage",
    "toStage" "DesignWorkflowStage" NOT NULL,
    "reason" TEXT,
    "trigger" TEXT NOT NULL DEFAULT 'auto',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectWorkflowEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProjectWorkflowEvent_projectId_createdAt_idx" ON "ProjectWorkflowEvent"("projectId", "createdAt");

ALTER TABLE "ProjectWorkflowEvent" ADD CONSTRAINT "ProjectWorkflowEvent_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
