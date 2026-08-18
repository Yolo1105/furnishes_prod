-- CreateTable
CREATE TABLE "ImplicitSignal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "category" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImplicitSignal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ImplicitSignal_userId_createdAt_idx" ON "ImplicitSignal"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ImplicitSignal_conversationId_idx" ON "ImplicitSignal"("conversationId");

-- AddForeignKey
ALTER TABLE "ImplicitSignal" ADD CONSTRAINT "ImplicitSignal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImplicitSignal" ADD CONSTRAINT "ImplicitSignal_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
