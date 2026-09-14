import type { Metadata } from "next";
import { LandingEntry } from "@/features/landing/LandingEntry";
import {
  firstSearchParam,
  isLandingIntroReplayQuery,
  shouldSkipLandingLoader,
} from "@/features/landing/landing-intro";
import { getOptionalCurrentSession } from "@/server/auth/session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: {
    absolute: "Furnishes | Interior Design Studio",
  },
};

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{
    intro?: string | string[];
    e2e?: string | string[];
  }>;
}) {
  const session = await getOptionalCurrentSession();
  const userLabel =
    session?.user.displayName?.trim() ||
    session?.user.email?.split("@")[0] ||
    null;

  const params = await searchParams;
  const introQuery = firstSearchParam(params.intro);
  const skipFromQuery = shouldSkipLandingLoader({ introQuery });
  const e2eMode =
    process.env.NEXT_PUBLIC_E2E === "1" && firstSearchParam(params.e2e) === "1";

  return (
    <LandingEntry
      userLabel={userLabel}
      skipLoader={skipFromQuery}
      skipIntro={skipFromQuery}
      replay={isLandingIntroReplayQuery(introQuery)}
      e2eMode={e2eMode}
    />
  );
}
