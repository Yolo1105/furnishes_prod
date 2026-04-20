-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN "currentNodeId" TEXT;

-- CreateTable
CREATE TABLE "NodeTransition" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "conversationId" TEXT NOT NULL,
    "fromNodeId" TEXT,
    "toNodeId" TEXT NOT NULL,
    "edgeId" TEXT,
    "reason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NodeTransition_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "NodeTransition_conversationId_idx" ON "NodeTransition"("conversationId");
