import type {
  StyleProfileRecord,
  ShortlistItem as PrismaShortlistRow,
} from "@prisma/client";
import type { NotificationPrefs } from "@/lib/site/account/types";
import type { StyleProfile } from "@/lib/site/account/types";
import type {
  ShortlistItem,
  ShortlistItemDetail,
} from "@/lib/site/account/types";

export function styleRecordToStyleProfile(
  row: StyleProfileRecord,
): StyleProfile {
  return {
    key: row.styleKey as StyleProfile["key"],
    name: row.name,
    tagline: row.tagline,
    description: row.description,
    palette: row.palette,
    keywords: row.keywords,
    takenAt: row.takenAt.toISOString(),
  };
}

export function shortlistRowToListItem(
  row: PrismaShortlistRow & { project?: { title: string } | null },
): ShortlistItem {
  return {
    id: row.id,
    productId: row.productId,
    productName: row.productName,
    productCategory: row.productCategory,
    priceCents: row.priceCents,
    currency: row.currency,
    projectId: row.projectId,
    projectName: row.project?.title ?? null,
    coverHue: row.coverHue,
    createdAt: row.createdAt.toISOString(),
  };
}

export function shortlistRowToDetail(
  row: PrismaShortlistRow & { project?: { title: string } | null },
  relatedItemIds: string[],
): ShortlistItemDetail {
  const base = shortlistRowToListItem(row);
  const desc =
    row.description ??
    "Product details will appear here once fully synced from Collections.";
  const materials = row.materials?.length ? row.materials : ["—"];
  const dims = {
    widthCm: row.widthCm ?? 0,
    depthCm: row.depthCm ?? 0,
    heightCm: row.heightCm ?? 0,
  };
  const rationale =
    row.rationale ??
    "Eva will add a personalized rationale when this piece is saved from chat or Collections.";
  return {
    ...base,
    description: desc,
    materials,
    dimensionsCm: dims,
    rationale,
    relatedItemIds,
  };
}

/** Matrix JSON from DB → typed prefs (best-effort). */
export function notificationMatrixFromJson(
  raw: unknown,
): NotificationPrefs["matrix"] {
  const fallback = {} as NotificationPrefs["matrix"];
  if (!raw || typeof raw !== "object") return fallback;
  return raw as NotificationPrefs["matrix"];
}

export function notificationRowToPrefs(row: {
  matrix: unknown;
  digestFrequency: "instant" | "daily" | "weekly";
  quietHoursStart: string;
  quietHoursEnd: string;
}): NotificationPrefs {
  return {
    matrix: notificationMatrixFromJson(row.matrix),
    digestFrequency: row.digestFrequency,
    quietHoursStart: row.quietHoursStart,
    quietHoursEnd: row.quietHoursEnd,
  };
}

/** Defaults when the user has no `NotificationPrefs` row yet (not mock fixtures). */
export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  matrix: {
    transactional: { email: true, sms: false, push: true },
    marketing: { email: false, sms: false, push: false },
    collections: { email: true, push: false },
    "eva-digest": { email: true },
    "design-tips": { email: true, push: false },
    "project-activity": { email: true, sms: false, push: true },
    "shared-mentions": { email: true, sms: true, push: true },
  },
  digestFrequency: "weekly",
  quietHoursStart: "22:00",
  quietHoursEnd: "07:30",
};
