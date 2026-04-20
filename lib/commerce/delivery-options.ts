import type { DeliveryMethod } from "@prisma/client";
import type { DeliveryOption } from "@/lib/site/commerce/types";

const MS_DAY = 86_400_000;

type Def = {
  label: string;
  subtitle: string;
  priceCents: number;
  kind: DeliveryOption["kind"];
  etaMinDays: number;
  etaMaxDays: number;
  appliesTo: NonNullable<DeliveryOption["appliesTo"]>;
};

const DEFS: Record<DeliveryMethod, Def> = {
  standard: {
    label: "Standard delivery",
    subtitle: "Couriered to your door. Leave at unit or pickup from lobby.",
    priceCents: 0,
    kind: "standard",
    etaMinDays: 5,
    etaMaxDays: 10,
    appliesTo: "all",
  },
  scheduled: {
    label: "Scheduled delivery",
    subtitle: "Pick a 4-hour window on a date that works for you.",
    priceCents: 12_000,
    kind: "scheduled",
    etaMinDays: 7,
    etaMaxDays: 14,
    appliesTo: "all",
  },
  white_glove: {
    label: "White-glove installation",
    subtitle: "Two-person team delivers + assembles + clears packaging.",
    priceCents: 28_000,
    kind: "white-glove",
    etaMinDays: 10,
    etaMaxDays: 17,
    appliesTo: "all",
  },
};

/** Stable id matches Prisma `DeliveryMethod` enum value. */
export function listDeliveryOptions(now = new Date()): DeliveryOption[] {
  return (Object.keys(DEFS) as DeliveryMethod[]).map((method) =>
    getDeliveryOptionByPrismaMethod(method, now),
  );
}

export function getDeliveryOptionByPrismaMethod(
  method: DeliveryMethod,
  now = new Date(),
): DeliveryOption {
  const d = DEFS[method];
  const t = now.getTime();
  return {
    id: method,
    kind: d.kind,
    label: d.label,
    subtitle: d.subtitle,
    priceCents: d.priceCents,
    etaFrom: new Date(t + d.etaMinDays * MS_DAY).toISOString(),
    etaTo: new Date(t + d.etaMaxDays * MS_DAY).toISOString(),
    appliesTo: d.appliesTo,
  };
}

export function deliveryCentsForMethod(method: DeliveryMethod): number {
  return DEFS[method].priceCents;
}

export function formatETARange(fromISO: string, toISO: string): string {
  const from = new Date(fromISO);
  const to = new Date(toISO);
  const fmt = new Intl.DateTimeFormat("en-SG", {
    day: "numeric",
    month: "short",
  });
  return `${fmt.format(from)} – ${fmt.format(to)}`;
}

/** Persisted ETA window for `Delivery` rows — aligned with checkout copy. */
export function etaRangeForDeliveryMethod(
  method: DeliveryMethod,
  from: Date,
): { etaFrom: Date; etaTo: Date } {
  const d = DEFS[method];
  const t = from.getTime();
  return {
    etaFrom: new Date(t + d.etaMinDays * MS_DAY),
    etaTo: new Date(t + d.etaMaxDays * MS_DAY),
  };
}
