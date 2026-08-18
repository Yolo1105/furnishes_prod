-- CreateTable
CREATE TABLE "SharedProject" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "shareId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "SharedProject_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SharedProject_shareId_key" ON "SharedProject"("shareId");

-- CreateIndex
CREATE INDEX "SharedProject_conversationId_idx" ON "SharedProject"("conversationId");

-- CreateIndex
CREATE INDEX "SharedProject_shareId_idx" ON "SharedProject"("shareId");

-- AddForeignKey
ALTER TABLE "SharedProject" ADD CONSTRAINT "SharedProject_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
