-- CreateTable
CREATE TABLE "FurnitureStudioPiece" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "quality" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'completed',
    "imageGenerationId" TEXT,
    "sourcePieceId" TEXT,
    "outputUploadId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FurnitureStudioPiece_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FurnitureStudioPiece_imageGenerationId_key" ON "FurnitureStudioPiece"("imageGenerationId");

-- CreateIndex
CREATE UNIQUE INDEX "FurnitureStudioPiece_outputUploadId_key" ON "FurnitureStudioPiece"("outputUploadId");

-- CreateIndex
CREATE INDEX "FurnitureStudioPiece_userId_createdAt_idx" ON "FurnitureStudioPiece"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "FurnitureStudioPiece_sourcePieceId_idx" ON "FurnitureStudioPiece"("sourcePieceId");

-- AddForeignKey
ALTER TABLE "FurnitureStudioPiece" ADD CONSTRAINT "FurnitureStudioPiece_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FurnitureStudioPiece" ADD CONSTRAINT "FurnitureStudioPiece_imageGenerationId_fkey" FOREIGN KEY ("imageGenerationId") REFERENCES "ImageGeneration"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FurnitureStudioPiece" ADD CONSTRAINT "FurnitureStudioPiece_outputUploadId_fkey" FOREIGN KEY ("outputUploadId") REFERENCES "Upload"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FurnitureStudioPiece" ADD CONSTRAINT "FurnitureStudioPiece_sourcePieceId_fkey" FOREIGN KEY ("sourcePieceId") REFERENCES "FurnitureStudioPiece"("id") ON DELETE SET NULL ON UPDATE CASCADE;
