import { Package } from "lucide-react";
import { AccountServerLink } from "@/components/eva-dashboard/account/account-server-link";
import {
  PageHeader,
  Eyebrow,
  SectionCard,
  StatusBadge,
  EmptyState,
} from "@/components/eva-dashboard/account/shared";
import { LOGIN_HREF } from "@/content/site/site";
import { formatDeliveryMethodLabel } from "@/lib/site/account/commerce-labels";
import type { AccountOrderSummary } from "@/lib/site/account/server/orders";
import { formatAccountDateTime } from "@/lib/site/account/account-datetime";
import { formatMoneyCentsLoose } from "@/lib/site/money";
import { WORKFLOW_ROUTES } from "@/lib/site/workflow-routes";

function orderStatusVariant(
  s: AccountOrderSummary["status"],
): "active" | "warn" | "ok" | "archived" {
  switch (s) {
    case "placed":
    case "paid":
    case "processing":
      return "active";
    case "shipped":
      return "warn";
    case "delivered":
      return "ok";
    case "cancelled":
    case "refunded":
      return "archived";
    default:
      return "active";
  }
}

function orderStatusLabel(s: AccountOrderSummary["status"]): string {
  const map: Record<AccountOrderSummary["status"], string> = {
    placed: "PLACED",
    paid: "PAID",
    processing: "PROCESSING",
    shipped: "SHIPPED",
    delivered: "DELIVERED",
    cancelled: "CANCELLED",
    refunded: "REFUNDED",
  };
  return map[s] ?? String(s).toUpperCase();
}

export function OrdersView({
  orders,
  signedOut,
}: {
  orders: AccountOrderSummary[];
  signedOut?: boolean;
}) {
  if (signedOut) {
    return (
      <div className="mx-auto w-full max-w-[1320px] px-6 py-8 sm:px-8 md:py-10 lg:px-10">
        <PageHeader
          eyebrow="ORDERS"
          title="Your orders"
          subtitle="Sign in to see purchases linked to your account."
        />
        <EmptyState
          icon={Package}
          title="Sign in required"
          body="Order history is available when you are signed in with the same account you used at checkout."
          cta={
            <AccountServerLink href={LOGIN_HREF} variant="primary">
              Sign in
            </AccountServerLink>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1320px] px-6 py-8 sm:px-8 md:py-10 lg:px-10">
      <PageHeader
        eyebrow="ORDERS"
        title="Your orders"
        subtitle="Orders placed with Furnishes appear here with status and line items from checkout."
      />

      {orders.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No orders yet"
          body="When you complete a purchase, your order history will show up here."
          cta={
            <AccountServerLink
              href={WORKFLOW_ROUTES.collections}
              variant="primary"
            >
              Browse collections
            </AccountServerLink>
          }
        />
      ) : (
        <ul className="space-y-4">
          {orders.map((o) => (
            <li key={o.id}>
              <SectionCard padding="lg">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Eyebrow>{o.number}</Eyebrow>
                      <StatusBadge variant={orderStatusVariant(o.status)}>
                        {orderStatusLabel(o.status)}
                      </StatusBadge>
                    </div>
                    <p
                      className="font-body mt-2 text-sm"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      Placed {formatAccountDateTime(o.placedAt)} ·{" "}
                      {formatDeliveryMethodLabel(o.deliveryMethod, "long")}
                    </p>
                    {o.hasDelivery && o.deliveryStatusLabel && (
                      <p
                        className="font-body mt-1 text-xs"
                        style={{ color: "var(--muted-foreground)" }}
                      >
                        Delivery: {o.deliveryStatusLabel}
                      </p>
                    )}
                  </div>
                  <div
                    className="font-display text-lg tabular-nums"
                    style={{ color: "var(--foreground)" }}
                  >
                    {formatMoneyCentsLoose(o.totalCents, o.currency)}
                  </div>
                </div>

                {o.items.length > 0 && (
                  <ul
                    className="mt-4 space-y-2 border-t pt-4"
                    style={{ borderColor: "var(--border)" }}
                  >
                    {o.items.slice(0, 5).map((it, idx) => (
                      <li
                        key={`${o.id}-it-${idx}`}
                        className="flex flex-wrap items-baseline justify-between gap-2 text-sm"
                        style={{ color: "var(--foreground)" }}
                      >
                        <span>
                          {it.name}
                          {it.category ? (
                            <span
                              className="font-ui ml-2 text-[10px] tracking-[0.12em] uppercase"
                              style={{ color: "var(--muted-foreground)" }}
                            >
                              {it.category}
                            </span>
                          ) : null}
                        </span>
                        <span className="tabular-nums">
                          ×{it.qty} ·{" "}
                          {formatMoneyCentsLoose(
                            it.unitPriceCents * it.qty,
                            o.currency,
                          )}
                        </span>
                      </li>
                    ))}
                    {o.items.length > 5 && (
                      <li
                        className="text-xs"
                        style={{ color: "var(--muted-foreground)" }}
                      >
                        +{o.items.length - 5} more line item
                        {o.items.length - 5 === 1 ? "" : "s"}
                      </li>
                    )}
                  </ul>
                )}
              </SectionCard>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
