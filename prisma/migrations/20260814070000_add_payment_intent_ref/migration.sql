-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "paymentIntentRef" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Order_paymentIntentRef_key" ON "Order"("paymentIntentRef");
