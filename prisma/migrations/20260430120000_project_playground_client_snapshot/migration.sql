-- Furnishes Studio: server-authoritative Playground snapshot + revision (optimistic lock).
ALTER TABLE "Project" ADD COLUMN "playgroundClientSnapshot" JSONB;
