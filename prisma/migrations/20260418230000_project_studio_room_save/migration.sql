-- CreateTable
CREATE TABLE "ProjectStudioRoomSave" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "roomShapeId" TEXT NOT NULL,
    "widthM" DOUBLE PRECISION NOT NULL,
    "depthM" DOUBLE PRECISION NOT NULL,
    "environment" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'eva_studio',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectStudioRoomSave_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectStudioPlacement" (
    "id" TEXT NOT NULL,
    "saveId" TEXT NOT NULL,
    "furnitureStudioPieceId" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "positionX" DOUBLE PRECISION NOT NULL,
    "positionZ" DOUBLE PRECISION NOT NULL,
    "rotationY" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "ProjectStudioPlacement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProjectStudioRoomSave_projectId_createdAt_idx" ON "ProjectStudioRoomSave"("projectId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "ProjectStudioPlacement_furnitureStudioPieceId_idx" ON "ProjectStudioPlacement"("furnitureStudioPieceId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectStudioPlacement_saveId_orderIndex_key" ON "ProjectStudioPlacement"("saveId", "orderIndex");

-- AddForeignKey
ALTER TABLE "ProjectStudioRoomSave" ADD CONSTRAINT "ProjectStudioRoomSave_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectStudioPlacement" ADD CONSTRAINT "ProjectStudioPlacement_saveId_fkey" FOREIGN KEY ("saveId") REFERENCES "ProjectStudioRoomSave"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectStudioPlacement" ADD CONSTRAINT "ProjectStudioPlacement_furnitureStudioPieceId_fkey" FOREIGN KEY ("furnitureStudioPieceId") REFERENCES "FurnitureStudioPiece"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
