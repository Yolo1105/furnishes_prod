-- AlterTable
ALTER TABLE "NotificationPrefs" RENAME COLUMN "emailProduct" TO "emailUpdates";

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Upload" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "projectId" TEXT,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ready',
    "source" TEXT NOT NULL DEFAULT 'user_upload',
    "storageKey" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Upload_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Upload_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Upload" ("createdAt", "filename", "id", "mimeType", "projectId", "sizeBytes", "status", "storageKey", "userId") SELECT "createdAt", "filename", "id", "mimeType", "projectId", "sizeBytes", "status", "storageKey", "userId" FROM "Upload";
DROP TABLE "Upload";
ALTER TABLE "new_Upload" RENAME TO "Upload";
CREATE INDEX "Upload_userId_createdAt_idx" ON "Upload"("userId", "createdAt");

CREATE TABLE "ImageGeneration" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "projectId" TEXT,
    "outputUploadId" TEXT,
    "prompt" TEXT NOT NULL,
    "negativePrompt" TEXT,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "provider" TEXT NOT NULL,
    "providerJobId" TEXT,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "startedAt" DATETIME,
    "completedAt" DATETIME,
    "canceledAt" DATETIME,
    CONSTRAINT "ImageGeneration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ImageGeneration_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ImageGeneration_outputUploadId_fkey" FOREIGN KEY ("outputUploadId") REFERENCES "Upload" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ImageGeneration_outputUploadId_key" ON "ImageGeneration"("outputUploadId");
CREATE INDEX "ImageGeneration_userId_createdAt_idx" ON "ImageGeneration"("userId", "createdAt");
CREATE INDEX "ImageGeneration_projectId_createdAt_idx" ON "ImageGeneration"("projectId", "createdAt");
CREATE INDEX "ImageGeneration_status_idx" ON "ImageGeneration"("status");

CREATE TABLE "InspirationItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "projectId" TEXT,
    "uploadId" TEXT,
    "imageGenerationId" TEXT,
    "title" TEXT,
    "note" TEXT,
    "roomLabel" TEXT,
    "colorsJson" TEXT,
    "materialsJson" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "InspirationItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "InspirationItem_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "InspirationItem_uploadId_fkey" FOREIGN KEY ("uploadId") REFERENCES "Upload" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "InspirationItem_imageGenerationId_fkey" FOREIGN KEY ("imageGenerationId") REFERENCES "ImageGeneration" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "InspirationItem_userId_createdAt_idx" ON "InspirationItem"("userId", "createdAt");
CREATE INDEX "InspirationItem_projectId_createdAt_idx" ON "InspirationItem"("projectId", "createdAt");
CREATE INDEX "InspirationItem_imageGenerationId_idx" ON "InspirationItem"("imageGenerationId");
CREATE UNIQUE INDEX "InspirationItem_userId_uploadId_key" ON "InspirationItem"("userId", "uploadId");
CREATE UNIQUE INDEX "InspirationItem_userId_imageGenerationId_key" ON "InspirationItem"("userId", "imageGenerationId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
