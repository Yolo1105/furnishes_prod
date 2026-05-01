-- CreateTable
CREATE TABLE "ProcessedStripeEvent" (
    "stripeEventId" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProcessedStripeEvent_pkey" PRIMARY KEY ("stripeEventId")
);
