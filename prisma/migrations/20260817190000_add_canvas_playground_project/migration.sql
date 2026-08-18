-- CreateTable
CREATE TABLE "CanvasPlaygroundProject" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 0,
    "snapshot" JSONB,
    "blankScene" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CanvasPlaygroundProject_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CanvasPlaygroundProject_ownerId_updatedAt_idx" ON "CanvasPlaygroundProject"("ownerId", "updatedAt");

-- AddForeignKey
ALTER TABLE "CanvasPlaygroundProject" ADD CONSTRAINT "CanvasPlaygroundProject_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
