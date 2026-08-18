-- CreateEnum
CREATE TYPE "WorkflowStage" AS ENUM (
  'intake',
  'preference_capture',
  'clarification',
  'recommendation_generation',
  'refinement',
  'decision_handoff'
);

-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN "workflowStage" "WorkflowStage" NOT NULL DEFAULT 'intake';

-- CreateTable
CREATE TABLE "WorkflowEvent" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "fromStage" TEXT NOT NULL,
    "toStage" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkflowEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WorkflowEvent_conversationId_createdAt_idx" ON "WorkflowEvent"("conversationId", "createdAt");

-- AddForeignKey
ALTER TABLE "WorkflowEvent" ADD CONSTRAINT "WorkflowEvent_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
