"use client";

import { useCallback, useSyncExternalStore } from "react";
import { getHeaderNavTone } from "@/lib/site/landing-nav-tone";

/**
 * Live header nav tone for the first landing section, driven by scroll position.
 * Uses `useSyncExternalStore` so we don't need `setState` inside `useEffect`.
 */
export function useFirstSectionNavTheme(firstSectionId: string | undefined) {
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (firstSectionId == null || firstSectionId === "") {
        return () => {};
      }
      const handler = () => onChange();
      window.addEventListener("scroll", handler, { passive: true });
      window.addEventListener("resize", handler);
      return () => {
        window.removeEventListener("scroll", handler);
        window.removeEventListener("resize", handler);
      };
    },
    [firstSectionId],
  );

  const getSnapshot = useCallback(() => {
    if (firstSectionId == null || firstSectionId === "") return null;
    return getHeaderNavTone(firstSectionId);
  }, [firstSectionId]);

  const getServerSnapshot = useCallback(() => null, []);

  const tone = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  if (firstSectionId == null || firstSectionId === "") {
    return null;
  }

  return tone;
}
