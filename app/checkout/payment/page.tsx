import { redirect } from "next/navigation";

/** Legacy route — payment is collected on `/checkout/pay/[orderId]` after review. */
export default function CheckoutPaymentLegacyPage() {
  redirect("/checkout/review");
}
