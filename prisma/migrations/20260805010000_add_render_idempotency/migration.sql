-- AlterTable
ALTER TABLE "ImageGeneration" ADD COLUMN "clientRenderId" TEXT;
ALTER TABLE "ImageGeneration" ADD COLUMN "structureCheck" JSONB;

-- CreateIndex
CREATE UNIQUE INDEX "ImageGeneration_userId_clientRenderId_key" ON "ImageGeneration"("userId", "clientRenderId");
