import {
  CheckoutPayHeader,
  CheckoutStripePay,
} from "@/components/commerce/checkout-stripe-pay";

export default async function Page({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;

  return (
    <div className="mx-auto w-full max-w-[560px] px-6 py-8 sm:px-8 md:py-10 lg:px-10">
      <CheckoutPayHeader />
      <CheckoutStripePay orderId={orderId} />
    </div>
  );
}
