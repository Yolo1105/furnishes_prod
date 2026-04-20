"use client";

export function CartView() {
  return (
    <div className="border-border bg-card rounded border p-4">
      <h1 className="text-foreground text-base font-semibold">Shopping Cart</h1>
      <p className="text-muted-foreground mb-4 text-xs">
        Review your selected items
      </p>
      <div className="space-y-3">
        <div className="border-border bg-background rounded border p-4">
          <p className="text-muted-foreground text-sm">Your cart is empty</p>
        </div>
      </div>
    </div>
  );
}
