-- CreateTable
CREATE TABLE "CostLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "conversationId" TEXT,
    "model" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "inputTokens" INTEGER NOT NULL,
    "outputTokens" INTEGER NOT NULL,
    "costUsd" DECIMAL(10,6) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CostLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CostLog_userId_createdAt_idx" ON "CostLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "CostLog_conversationId_idx" ON "CostLog"("conversationId");

-- CreateIndex
CREATE INDEX "CostLog_createdAt_idx" ON "CostLog"("createdAt");

-- AddForeignKey
ALTER TABLE "CostLog" ADD CONSTRAINT "CostLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CostLog" ADD CONSTRAINT "CostLog_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
