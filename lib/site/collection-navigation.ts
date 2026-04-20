import {
  COLLECTION_DEFAULT_HERO_DESCRIPTION,
  DEFAULT_COLLECTION_ROOM,
  DEFAULT_SORT,
  sortOptions,
  quickFilters,
} from "@/content/site/collection";
import type {
  CollectionProduct,
  CollectionProductDetail,
} from "@/content/site/collection";

/** Query keys that map to `quickActive` groups (multi-value via repeated params). */
export const COLLECTION_QUICK_PARAM_KEYS = quickFilters.map(
  (f) => f.id,
) as readonly string[];

export type CollectionUrlState = {
  quickActive: Record<string, string[]>;
  sort: string;
  q: string;
};

/**
 * One value per quick-filter group (latest wins). Ensures `room` defaults to {@link DEFAULT_COLLECTION_ROOM}.
 */
export function normalizeQuickActive(
  quick: Record<string, string[]>,
): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const id of COLLECTION_QUICK_PARAM_KEYS) {
    const vals = quick[id];
    if (vals?.length) out[id] = [vals[vals.length - 1]!];
  }
  if (!out.room?.length) out.room = [DEFAULT_COLLECTION_ROOM];
  return out;
}

export function getDefaultListingQuickActive(): Record<string, string[]> {
  return { room: [DEFAULT_COLLECTION_ROOM] };
}

/** True when only the default room is active (no extra quick filters). */
export function isListingQuickDefault(
  quick: Record<string, string[]>,
): boolean {
  const n = normalizeQuickActive(quick);
  const keys = Object.keys(n);
  return (
    keys.length === 1 &&
    keys[0] === "room" &&
    n.room?.[0] === DEFAULT_COLLECTION_ROOM
  );
}

export function parseCollectionSearchParams(
  searchParams: URLSearchParams,
): CollectionUrlState {
  const quickActive: Record<string, string[]> = {};
  for (const id of COLLECTION_QUICK_PARAM_KEYS) {
    const vals = searchParams.getAll(id);
    if (vals.length > 0) quickActive[id] = vals;
  }
  const sortRaw = searchParams.get("sort") ?? "";
  const sort = sortOptions.includes(sortRaw) ? sortRaw : DEFAULT_SORT;
  const q = searchParams.get("q")?.trim() ?? "";
  return { quickActive: normalizeQuickActive(quickActive), sort, q };
}

export function buildCollectionSearchParams(
  state: CollectionUrlState,
): URLSearchParams {
  const p = new URLSearchParams();
  if (state.q) p.set("q", state.q);
  if (state.sort !== DEFAULT_SORT) p.set("sort", state.sort);
  for (const [gid, vals] of Object.entries(state.quickActive)) {
    for (const v of vals) {
      p.append(gid, v);
    }
  }
  return p;
}

export function buildCollectionListingHref(state: CollectionUrlState): string {
  const p = buildCollectionSearchParams(state);
  const qs = p.toString();
  return qs ? `/collections?${qs}` : "/collections";
}

/** PDP intro link — listing filtered to this room only (default sort, no search). */
export function buildRoomFilteredListingHref(room: string): string {
  return buildCollectionListingHref({
    quickActive: { room: [room] },
    sort: DEFAULT_SORT,
    q: "",
  });
}

export function buildProductDetailHref(
  productId: string | number,
  state: CollectionUrlState,
): string {
  const p = buildCollectionSearchParams(state);
  const qs = p.toString();
  return qs ? `/collections/${productId}?${qs}` : `/collections/${productId}`;
}

export type BreadcrumbItem = {
  label: string;
  href: string | null;
};

/**
 * Directory / breadcrumb display: first character uppercase, remaining letters lowercase per segment.
 * Preserves curly or straight quotes around search terms.
 */
export function formatDirectoryLabel(label: string): string {
  const t = label.trim();
  if (!t) return t;
  if (t.startsWith("\u201c") && t.endsWith("\u201d") && t.length >= 2) {
    const inner = t.slice(1, -1);
    if (!inner) return t;
    const f = inner.charAt(0).toUpperCase() + inner.slice(1).toLowerCase();
    return "\u201c" + f + "\u201d";
  }
  if (t.startsWith('"') && t.endsWith('"') && t.length >= 2) {
    const inner = t.slice(1, -1);
    if (!inner) return t;
    const f = inner.charAt(0).toUpperCase() + inner.slice(1).toLowerCase();
    return '"' + f + '"';
  }
  return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
}

/** First segment of listing / PDP directory trails (`Collection > …`). */
export const COLLECTION_ROOT_LABEL = "Collection";

/** Order for which active quick filter drives the grey intro line under the directory headline. */
const COLLECTION_HERO_DESCRIPTION_PRIORITY = [
  "room",
  "category",
  "style",
] as const;

type CollectionHeroDescriptionFocus =
  | { kind: "default" }
  | { kind: "room"; label: string }
  | { kind: "category"; label: string }
  | { kind: "style"; label: string };

function resolveCollectionHeroDescriptionFocus(
  state: CollectionUrlState,
): CollectionHeroDescriptionFocus {
  for (const id of COLLECTION_HERO_DESCRIPTION_PRIORITY) {
    const vals = state.quickActive[id];
    if (!vals?.length) continue;
    return { kind: id, label: vals[0]! };
  }
  return { kind: "default" };
}

function heroDescriptionForFocus(
  focus: CollectionHeroDescriptionFocus,
): string {
  switch (focus.kind) {
    case "default":
      return COLLECTION_DEFAULT_HERO_DESCRIPTION;
    case "room":
      return `Thoughtful picks for ${focus.label}. Scale, flow, and finish suited to the space.`;
    case "category":
      return `Our edit of ${focus.label}. Silhouettes, comfort, and construction worth keeping.`;
    case "style":
      return `${focus.label} in focus. Line, palette, and proportion curated for this look.`;
  }
}

/** Grey intro line under the directory headline on `/collections` (filter-aware). */
export function getCollectionListingHeroDescription(
  state: CollectionUrlState,
): string {
  return heroDescriptionForFocus(resolveCollectionHeroDescriptionFocus(state));
}

/** Listing page: trail from current filters (shareable URLs). */
export function buildListingBreadcrumbs(
  state: CollectionUrlState,
): BreadcrumbItem[] {
  const items: BreadcrumbItem[] = [
    { label: COLLECTION_ROOT_LABEL, href: "/collections" },
  ];

  const { quickActive, q, sort } = state;

  for (const id of COLLECTION_QUICK_PARAM_KEYS) {
    const vals = quickActive[id];
    if (!vals?.length) continue;
    for (const val of vals) {
      const partial: CollectionUrlState = {
        quickActive: { [id]: [val] },
        sort: DEFAULT_SORT,
        q: "",
      };
      items.push({
        label: val,
        href: buildCollectionListingHref(partial),
      });
    }
  }

  if (sort !== DEFAULT_SORT) {
    items.push({
      label: sort,
      href: buildCollectionListingHref({ ...state, q: "" }),
    });
  }

  if (q) {
    items.push({
      label: q.length > 28 ? `“${q.slice(0, 28)}…”` : `“${q}”`,
      href: buildCollectionListingHref({ ...state, sort: DEFAULT_SORT }),
    });
  }

  return items;
}

/** PDP: Collection → …filters from URL → product name (current page = no href). */
export function buildProductBreadcrumbs(
  product: CollectionProduct | CollectionProductDetail,
  listingParams: URLSearchParams,
): BreadcrumbItem[] {
  const state = parseCollectionSearchParams(listingParams);
  const trail = buildListingBreadcrumbs(state);
  trail.push({
    label: product.name,
    href: null,
  });
  return trail;
}
