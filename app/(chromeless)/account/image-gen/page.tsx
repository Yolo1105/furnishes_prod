import { Suspense } from "react";
import { ImageGenWorkspace } from "@/components/eva-dashboard/account/image-gen/image-gen-workspace";
import {
  STUDIO_ARRANGE_TAB_VALUE,
  type StudioTab,
} from "@/components/eva-dashboard/account/image-gen/constants";

/**
 * Image Gen page — layout (controls | canvas | Eva) comes from `ImageGenPageLayout` inside `ImageGenWorkspace`;
 * providers live in `./layout.tsx`.
 */
export default async function ImageGenPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const initialTab: StudioTab =
    tab === STUDIO_ARRANGE_TAB_VALUE ? "arrange" : "generate";

  return (
    <Suspense
      fallback={
        <div className="text-muted-foreground p-6 text-sm">Loading studio…</div>
      }
    >
      <ImageGenWorkspace initialTab={initialTab} />
    </Suspense>
  );
}
