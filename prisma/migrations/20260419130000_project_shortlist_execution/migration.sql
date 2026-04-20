-- CreateEnum
CREATE TYPE "ProjectShortlistStatus" AS ENUM ('considering', 'primary', 'backup', 'rejected');

-- DropIndex (old unique becomes non-unique index via replacement)
DROP INDEX IF EXISTS "ShortlistItem_userId_productId_key";

-- AlterTable
ALTER TABLE "ShortlistItem" ADD COLUMN "sourceConversationId" TEXT,
ADD COLUMN "sourceRecommendationId" TEXT,
ADD COLUMN "summary" TEXT,
ADD COLUMN "reasonSelected" TEXT,
ADD COLUMN "notes" TEXT,
ADD COLUMN "status" "ProjectShortlistStatus" NOT NULL DEFAULT 'considering',
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX "ShortlistItem_userId_projectId_productId_idx" ON "ShortlistItem"("userId", "projectId", "productId");
