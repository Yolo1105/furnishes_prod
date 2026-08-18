-- Quiz-sourced preference proposals: provenance + optional chat message link.
ALTER TABLE "PreferenceProposal" ADD COLUMN "source" TEXT NOT NULL DEFAULT 'chat';

ALTER TABLE "PreferenceProposal" DROP CONSTRAINT "PreferenceProposal_conversationId_fkey";
ALTER TABLE "PreferenceProposal" DROP CONSTRAINT "PreferenceProposal_sourceMessageId_fkey";

ALTER TABLE "PreferenceProposal" ALTER COLUMN "conversationId" DROP NOT NULL;
ALTER TABLE "PreferenceProposal" ALTER COLUMN "sourceMessageId" DROP NOT NULL;

ALTER TABLE "PreferenceProposal" ADD CONSTRAINT "PreferenceProposal_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PreferenceProposal" ADD CONSTRAINT "PreferenceProposal_sourceMessageId_fkey" FOREIGN KEY ("sourceMessageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "PreferenceProposal_userId_source_status_idx" ON "PreferenceProposal"("userId", "source", "status");
