-- AlterTable
ALTER TABLE "StyleProfile" ADD COLUMN "roomDimensions" JSONB;

-- CreateTable
CREATE TABLE "DesignRecommendation" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "stableId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "rank" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DesignRecommendation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DesignRecommendation_conversationId_rank_idx" ON "DesignRecommendation"("conversationId", "rank");

-- CreateIndex
CREATE UNIQUE INDEX "DesignRecommendation_conversationId_stableId_key" ON "DesignRecommendation"("conversationId", "stableId");

-- AddForeignKey
ALTER TABLE "DesignRecommendation" ADD CONSTRAINT "DesignRecommendation_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
