-- Track last Playbook/workflow state change for clients and debugging.

ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "playbookUpdatedAt" TIMESTAMP(3);
