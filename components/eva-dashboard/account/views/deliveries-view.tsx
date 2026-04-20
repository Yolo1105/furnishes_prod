import Link from "next/link";
import { Truck } from "lucide-react";
import { AccountServerLink } from "@/components/eva-dashboard/account/account-server-link";
import {
  PageHeader,
  Eyebrow,
  SectionCard,
  StatusBadge,
  EmptyState,
} from "@/components/eva-dashboard/account/shared";
import { LOGIN_HREF } from "@/content/site/site";
import { accountPaths } from "@/lib/eva-dashboard/account-paths";
import {
  formatAccountDate,
  formatAccountDateTime,
  formatAccountDateTimeRange,
} from "@/lib/site/account/account-datetime";
import {
  formatDeliveryMethodLabel,
  formatDeliveryStatusLabel,
} from "@/lib/site/account/commerce-labels";
import type { AccountDeliveriesResult } from "@/lib/site/account/server/deliveries";
import { formatMoneyCentsLoose } from "@/lib/site/money";
import { WORKFLOW_ROUTES } from "@/lib/site/workflow-routes";

function formatWhen(d: Date | null): string | null {
  if (!d) return null;
  return formatAccountDateTime(d);
}

export function DeliveriesView({
  data,
  signedOut,
}: {
  data: AccountDeliveriesResult;
  signedOut?: boolean;
}) {
  const { trackedDeliveries, pendingDeliveryOrders } = data;

  if (signedOut) {
    return (
      <div className="mx-auto w-full max-w-[1320px] px-6 py-8 sm:px-8 md:py-10 lg:px-10">
        <PageHeader
          eyebrow="DELIVERIES"
          title="Deliveries"
          subtitle="Sign in to see shipments linked to your orders."
        />
        <EmptyState
          icon={Truck}
          title="Sign in required"
          body="Delivery updates appear here for orders on your account."
          cta={
            <AccountServerLink href={LOGIN_HREF} variant="primary">
              Sign in
            </AccountServerLink>
          }
        />
      </div>
    );
  }

  const empty =
    trackedDeliveries.length === 0 && pendingDeliveryOrders.length === 0;

  return (
    <div className="mx-auto w-full max-w-[1320px] px-6 py-8 sm:px-8 md:py-10 lg:px-10">
      <PageHeader
        eyebrow="DELIVERIES"
        title="Deliveries"
        subtitle="Tracked shipments and orders that are still being prepared or scheduled."
      />

      {empty ? (
        <EmptyState
          icon={Truck}
          title="No deliveries to show"
          body="When an order ships, tracking will appear in Tracked deliveries. Orders still preparing appear under Awaiting scheduling once you have an order in progress."
          cta={
            <AccountServerLink
              href={WORKFLOW_ROUTES.collections}
              variant="secondary"
            >
              Browse collections
            </AccountServerLink>
          }
        />
      ) : (
        <div className="space-y-10">
          {trackedDeliveries.length > 0 && (
            <section>
              <h2
                className="font-display mb-4 text-xl"
                style={{ color: "var(--foreground)" }}
              >
                Tracked deliveries
              </h2>
              <ul className="space-y-4">
                {trackedDeliveries.map((d) => (
                  <li key={d.deliveryId}>
                    <SectionCard padding="lg">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <Eyebrow>Order {d.orderNumber}</Eyebrow>
                            <StatusBadge variant="active">
                              {formatDeliveryStatusLabel(d.deliveryStatus)}
                            </StatusBadge>
                          </div>
                          <p
                            className="font-body mt-2 text-sm"
                            style={{ color: "var(--muted-foreground)" }}
                          >
                            {formatDeliveryMethodLabel(d.method, "short")} · ETA
                            window:{" "}
                            {formatAccountDateTimeRange(d.etaFrom, d.etaTo)}
                          </p>
                          {(d.courier || d.trackingNumber) && (
                            <p
                              className="font-body mt-1 text-sm"
                              style={{ color: "var(--foreground)" }}
                            >
                              {d.courier ? `${d.courier}` : ""}
                              {d.courier && d.trackingNumber ? " · " : ""}
                              {d.trackingNumber
                                ? `Tracking: ${d.trackingNumber}`
                                : ""}
                            </p>
                          )}
                          <ul
                            className="font-body mt-2 space-y-1 text-xs"
                            style={{ color: "var(--muted-foreground)" }}
                          >
                            {formatWhen(d.scheduledAt) && (
                              <li>Scheduled: {formatWhen(d.scheduledAt)}</li>
                            )}
                            {formatWhen(d.dispatchedAt) && (
                              <li>Dispatched: {formatWhen(d.dispatchedAt)}</li>
                            )}
                            {formatWhen(d.arrivedAt) && (
                              <li>Arrived: {formatWhen(d.arrivedAt)}</li>
                            )}
                          </ul>
                        </div>
                        <Link
                          href={accountPaths.orders}
                          className="font-ui text-[10px] tracking-[0.16em] uppercase hover:underline"
                          style={{ color: "var(--primary)" }}
                        >
                          View order →
                        </Link>
                      </div>
                    </SectionCard>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {pendingDeliveryOrders.length > 0 && (
            <section>
              <h2
                className="font-display mb-4 text-xl"
                style={{ color: "var(--foreground)" }}
              >
                Awaiting scheduling / preparing shipment
              </h2>
              <p
                className="font-body mb-4 max-w-2xl text-sm"
                style={{ color: "var(--muted-foreground)" }}
              >
                These orders do not have a delivery record yet. Status updates
                will appear here when logistics assigns tracking.
              </p>
              <ul className="space-y-4">
                {pendingDeliveryOrders.map((o) => (
                  <li key={o.orderId}>
                    <SectionCard padding="lg">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <Eyebrow>{o.orderNumber}</Eyebrow>
                            <StatusBadge variant="warn">
                              {o.stateLabel}
                            </StatusBadge>
                          </div>
                          <p
                            className="font-body mt-2 text-sm"
                            style={{ color: "var(--muted-foreground)" }}
                          >
                            Placed {formatAccountDate(o.placedAt)} ·{" "}
                            {formatDeliveryMethodLabel(
                              o.deliveryMethod,
                              "short",
                            )}
                          </p>
                        </div>
                        <span
                          className="font-display tabular-nums"
                          style={{ color: "var(--foreground)" }}
                        >
                          {formatMoneyCentsLoose(o.totalCents, o.currency)}
                        </span>
                      </div>
                    </SectionCard>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
