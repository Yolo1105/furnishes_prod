-- CreateEnum
CREATE TYPE "FurnitureStudioPieceStatus" AS ENUM ('completed', 'failed');

-- CreateTable
CREATE TABLE "FurnitureStudioPiece" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "quality" JSONB NOT NULL,
    "status" "FurnitureStudioPieceStatus" NOT NULL DEFAULT 'completed',
    "providerImageUrl" TEXT,
    "providerGlbUrl" TEXT,
    "storedImageUrl" TEXT,
    "storedGlbUrl" TEXT,
    "sourcePieceId" TEXT,
    "furnitureGenerationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FurnitureStudioPiece_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FurnitureStudioPiece_furnitureGenerationId_key" ON "FurnitureStudioPiece"("furnitureGenerationId");

-- CreateIndex
CREATE INDEX "FurnitureStudioPiece_userId_createdAt_idx" ON "FurnitureStudioPiece"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "FurnitureStudioPiece_sourcePieceId_idx" ON "FurnitureStudioPiece"("sourcePieceId");

-- AddForeignKey
ALTER TABLE "FurnitureStudioPiece" ADD CONSTRAINT "FurnitureStudioPiece_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FurnitureStudioPiece" ADD CONSTRAINT "FurnitureStudioPiece_sourcePieceId_fkey" FOREIGN KEY ("sourcePieceId") REFERENCES "FurnitureStudioPiece"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FurnitureStudioPiece" ADD CONSTRAINT "FurnitureStudioPiece_furnitureGenerationId_fkey" FOREIGN KEY ("furnitureGenerationId") REFERENCES "FurnitureGeneration"("id") ON DELETE SET NULL ON UPDATE CASCADE;
