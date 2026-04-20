import { CartView } from "@/components/commerce/cart-view";

export const metadata = {
  title: "Cart",
  description: "Review your cart and continue to checkout.",
  robots: { index: false, follow: false },
};

export default function CartPage() {
  return (
    <main className="border-border bg-card flex min-h-0 flex-1 flex-col overflow-y-auto border lg:overflow-hidden">
      <CartView />
    </main>
  );
}
