-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "clientMessageId" TEXT,
ADD COLUMN     "inReplyToId" TEXT;

-- CreateTable
CREATE TABLE "ChatGeneration" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "userMessageId" TEXT NOT NULL,
    "assistantMessageId" TEXT,
    "provider" TEXT NOT NULL,
    "model" TEXT,
    "status" TEXT NOT NULL,
    "errorCode" TEXT,
    "requestId" TEXT,
    "promptTokens" INTEGER,
    "completionTokens" INTEGER,
    "costUsd" DOUBLE PRECISION,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "ChatGeneration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ChatGeneration_userMessageId_key" ON "ChatGeneration"("userMessageId");

-- CreateIndex
CREATE UNIQUE INDEX "ChatGeneration_assistantMessageId_key" ON "ChatGeneration"("assistantMessageId");

-- CreateIndex
CREATE INDEX "ChatGeneration_conversationId_startedAt_idx" ON "ChatGeneration"("conversationId", "startedAt");

-- CreateIndex
CREATE INDEX "ChatGeneration_conversationId_status_idx" ON "ChatGeneration"("conversationId", "status");

-- CreateIndex
CREATE INDEX "ChatGeneration_status_startedAt_idx" ON "ChatGeneration"("status", "startedAt");

-- CreateIndex
CREATE INDEX "Message_inReplyToId_idx" ON "Message"("inReplyToId");

-- CreateIndex
CREATE UNIQUE INDEX "Message_conversationId_clientMessageId_key" ON "Message"("conversationId", "clientMessageId");

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_inReplyToId_fkey" FOREIGN KEY ("inReplyToId") REFERENCES "Message"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatGeneration" ADD CONSTRAINT "ChatGeneration_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatGeneration" ADD CONSTRAINT "ChatGeneration_userMessageId_fkey" FOREIGN KEY ("userMessageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatGeneration" ADD CONSTRAINT "ChatGeneration_assistantMessageId_fkey" FOREIGN KEY ("assistantMessageId") REFERENCES "Message"("id") ON DELETE SET NULL ON UPDATE CASCADE;
