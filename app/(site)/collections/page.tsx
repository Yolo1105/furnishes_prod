import { Suspense } from "react";
import { CollectionFilter } from "@/components/site/CollectionFilter";

/** Listing — clears fixed site header; `CollectionFilter` owns surface bg + grid. */
export default function CollectionsPage() {
  return (
    <div className="site-chrome-pad min-h-0 w-full flex-1 pt-[max(0px,calc(var(--site-content-pt)-1.0625rem))] md:pt-[max(0px,calc(var(--site-content-pt-md)-1.3125rem))]">
      <Suspense fallback={<div className="min-h-[60vh] w-full" aria-hidden />}>
        <CollectionFilter />
      </Suspense>
    </div>
  );
}
