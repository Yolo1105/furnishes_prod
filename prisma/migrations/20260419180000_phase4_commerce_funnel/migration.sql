-- Phase 4: truthful checkout — optional saved payment method, shipping snapshot, payment summary hints.

ALTER TABLE "Order" ALTER COLUMN "paymentMethodId" DROP NOT NULL;

ALTER TABLE "Order" ADD COLUMN "shippingSnapshot" JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE "Order" ADD COLUMN "paymentSummary" JSONB;
