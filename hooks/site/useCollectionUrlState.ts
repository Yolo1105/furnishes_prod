"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  buildCollectionSearchParams,
  parseCollectionSearchParams,
  type CollectionUrlState,
} from "@/lib/site/collection-navigation";

/**
 * URL is the source of truth for listing filters. No mirrored useState for
 * quick/sort/q — derive from `useSearchParams` and write via `updateUrl`.
 */
export function useCollectionUrlState() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const state = useMemo(
    () => parseCollectionSearchParams(searchParams),
    [searchParams],
  );

  const updateUrl = useCallback(
    (next: CollectionUrlState) => {
      const qs = buildCollectionSearchParams(next).toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname],
  );

  return { state, updateUrl };
}
