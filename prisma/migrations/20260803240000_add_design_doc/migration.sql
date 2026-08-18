-- CreateTable
CREATE TABLE "DesignDoc" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "chunkIndex" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "embedding" DOUBLE PRECISION[],
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DesignDoc_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DesignDoc_source_idx" ON "DesignDoc"("source");

-- CreateIndex
CREATE UNIQUE INDEX "DesignDoc_source_chunkIndex_key" ON "DesignDoc"("source", "chunkIndex");
