-- Phase 5: project-level decision context and cached recommendations snapshot for summary/handoff.

ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "decisionContext" JSONB;
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "recommendationsSnapshot" JSONB;
