import type { DeliveryMethod, DeliveryStatus } from "@prisma/client";

/** Single map for delivery row status (tracked deliveries + order summary line). */
const DELIVERY_STATUS_LABEL: Record<DeliveryStatus, string> = {
  scheduled: "Scheduled",
  in_transit: "In transit",
  arrived: "Arrived",
  failed: "Needs attention",
  rescheduled: "Rescheduled",
};

export function formatDeliveryStatusLabel(status: DeliveryStatus): string {
  return DELIVERY_STATUS_LABEL[status] ?? String(status);
}

const DELIVERY_METHOD_SHORT: Record<DeliveryMethod, string> = {
  standard: "Standard",
  scheduled: "Scheduled slot",
  white_glove: "White glove",
};

const DELIVERY_METHOD_LONG: Record<DeliveryMethod, string> = {
  standard: "Standard delivery",
  scheduled: "Scheduled delivery",
  white_glove: "White glove",
};

export function formatDeliveryMethodLabel(
  method: DeliveryMethod,
  variant: "short" | "long" = "short",
): string {
  return (variant === "long" ? DELIVERY_METHOD_LONG : DELIVERY_METHOD_SHORT)[
    method
  ];
}
