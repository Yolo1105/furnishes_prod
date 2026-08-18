-- CreateTable
CREATE TABLE "CanvasPlaygroundConversation" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CanvasPlaygroundConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CanvasPlaygroundConversationTurn" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "userText" TEXT NOT NULL DEFAULT '',
    "response" TEXT NOT NULL DEFAULT '',
    "displayTime" TEXT NOT NULL DEFAULT '',
    "metadata" JSONB,
    "positionHint" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CanvasPlaygroundConversationTurn_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CanvasPlaygroundConversation_ownerId_projectId_updatedAt_idx" ON "CanvasPlaygroundConversation"("ownerId", "projectId", "updatedAt");

-- CreateIndex
CREATE INDEX "CanvasPlaygroundConversationTurn_conversationId_createdAt_positionHint_idx" ON "CanvasPlaygroundConversationTurn"("conversationId", "createdAt", "positionHint");

-- AddForeignKey
ALTER TABLE "CanvasPlaygroundConversation" ADD CONSTRAINT "CanvasPlaygroundConversation_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CanvasPlaygroundConversation" ADD CONSTRAINT "CanvasPlaygroundConversation_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "CanvasPlaygroundProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CanvasPlaygroundConversationTurn" ADD CONSTRAINT "CanvasPlaygroundConversationTurn_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "CanvasPlaygroundConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
