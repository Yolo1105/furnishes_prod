-- CreateTable
CREATE TABLE "RoomPlan" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "projectId" TEXT,
    "name" TEXT NOT NULL,
    "budgetCapCents" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoomPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoomPlanItem" (
    "id" TEXT NOT NULL,
    "roomPlanId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'core',
    "status" TEXT NOT NULL DEFAULT 'needed',
    "budgetCents" INTEGER,
    "actualCents" INTEGER,
    "widthCm" INTEGER,
    "depthCm" INTEGER,
    "heightCm" INTEGER,
    "recommendationId" TEXT,
    "inspirationItemId" TEXT,
    "notes" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoomPlanItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RoomPlan_userId_updatedAt_idx" ON "RoomPlan"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX "RoomPlan_projectId_idx" ON "RoomPlan"("projectId");

-- CreateIndex
CREATE INDEX "RoomPlanItem_roomPlanId_sortOrder_idx" ON "RoomPlanItem"("roomPlanId", "sortOrder");

-- AddForeignKey
ALTER TABLE "RoomPlan" ADD CONSTRAINT "RoomPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomPlan" ADD CONSTRAINT "RoomPlan_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomPlanItem" ADD CONSTRAINT "RoomPlanItem_roomPlanId_fkey" FOREIGN KEY ("roomPlanId") REFERENCES "RoomPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
