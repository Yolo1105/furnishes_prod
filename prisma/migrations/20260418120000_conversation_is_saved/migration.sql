-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN     "isSaved" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "savedAt" TIMESTAMP(3);
