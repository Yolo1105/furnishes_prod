-- AlterTable
ALTER TABLE "User" ADD COLUMN "activeAssistantId" TEXT NOT NULL DEFAULT 'eva-general';

-- AlterTable
ALTER TABLE "Message" ADD COLUMN "assistantId" TEXT;

-- CreateTable
CREATE TABLE "PreferenceProposal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "sourceMessageId" TEXT NOT NULL,
    "displayMessageId" TEXT,
    "category" TEXT NOT NULL,
    "proposedValue" TEXT NOT NULL,
    "previousValue" TEXT,
    "acceptedValue" TEXT,
    "confidence" REAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "evidenceText" TEXT,
    "evidenceStart" INTEGER,
    "evidenceEnd" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" DATETIME,
    "revertedAt" DATETIME,
    CONSTRAINT "PreferenceProposal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PreferenceProposal_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PreferenceProposal_sourceMessageId_fkey" FOREIGN KEY ("sourceMessageId") REFERENCES "Message" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PreferenceProposal_displayMessageId_fkey" FOREIGN KEY ("displayMessageId") REFERENCES "Message" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UserPreference" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "confidence" REAL NOT NULL DEFAULT 1,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "sourceConversationId" TEXT,
    "sourceMessageId" TEXT,
    "sourceProposalId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UserPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UserPreference_sourceConversationId_fkey" FOREIGN KEY ("sourceConversationId") REFERENCES "Conversation" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "UserPreference_sourceMessageId_fkey" FOREIGN KEY ("sourceMessageId") REFERENCES "Message" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "UserPreference_sourceProposalId_fkey" FOREIGN KEY ("sourceProposalId") REFERENCES "PreferenceProposal" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "PreferenceProposal_userId_status_createdAt_idx" ON "PreferenceProposal"("userId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "PreferenceProposal_conversationId_createdAt_idx" ON "PreferenceProposal"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "PreferenceProposal_sourceMessageId_idx" ON "PreferenceProposal"("sourceMessageId");

-- CreateIndex
CREATE INDEX "PreferenceProposal_displayMessageId_idx" ON "PreferenceProposal"("displayMessageId");

-- CreateIndex
CREATE UNIQUE INDEX "UserPreference_sourceProposalId_key" ON "UserPreference"("sourceProposalId");

-- CreateIndex
CREATE INDEX "UserPreference_userId_updatedAt_idx" ON "UserPreference"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX "UserPreference_sourceConversationId_idx" ON "UserPreference"("sourceConversationId");

-- CreateIndex
CREATE INDEX "UserPreference_sourceMessageId_idx" ON "UserPreference"("sourceMessageId");

-- CreateIndex
CREATE UNIQUE INDEX "UserPreference_userId_category_key" ON "UserPreference"("userId", "category");
