-- CreateEnum
CREATE TYPE "FurnitureGenerationStatus" AS ENUM ('running', 'completed', 'failed');

-- CreateTable
CREATE TABLE "FurnitureGeneration" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "options" JSONB,
    "status" "FurnitureGenerationStatus" NOT NULL DEFAULT 'running',
    "imageUrl" TEXT,
    "glbUrl" TEXT,
    "errorMessage" TEXT,
    "durationMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "FurnitureGeneration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FurnitureGeneration_requestId_key" ON "FurnitureGeneration"("requestId");

-- CreateIndex
CREATE INDEX "FurnitureGeneration_userId_createdAt_idx" ON "FurnitureGeneration"("userId", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "FurnitureGeneration" ADD CONSTRAINT "FurnitureGeneration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
