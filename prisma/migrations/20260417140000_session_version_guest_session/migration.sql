-- AlterTable
ALTER TABLE "User" ADD COLUMN "sessionVersion" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN "guestSessionId" TEXT;

-- CreateIndex
CREATE INDEX "Conversation_guestSessionId_idx" ON "Conversation"("guestSessionId");
