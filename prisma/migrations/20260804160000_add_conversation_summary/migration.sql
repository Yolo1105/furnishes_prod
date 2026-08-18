-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN "contextSummary" TEXT;
ALTER TABLE "Conversation" ADD COLUMN "contextSummaryUpTo" INTEGER;
ALTER TABLE "Conversation" ADD COLUMN "contextSummaryUpdatedAt" TIMESTAMP(3);
