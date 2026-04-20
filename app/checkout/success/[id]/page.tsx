import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { CheckoutSuccessView } from "@/components/commerce/checkout-success-view";

export default async function CheckoutSuccessPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/login?next=/checkout/success/${encodeURIComponent(id)}`);
  }

  const order = await prisma.order.findFirst({
    where: { id, userId: session.user.id },
    select: { id: true, number: true, status: true },
  });

  if (!order) {
    redirect("/account/orders");
  }

  return (
    <CheckoutSuccessView orderNumber={order.number} status={order.status} />
  );
}
