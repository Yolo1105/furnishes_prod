import { cookies } from "next/headers";
import { Suspense } from "react";
import { LandingEntry } from "@/features/landing/LandingEntry";
import {
  LANDING_INTRO_SEEN_COOKIE,
  shouldSkipLandingLoader,
} from "@/features/landing/landing-intro";
import { getOptionalCurrentSession } from "@/server/auth/session";

export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ intro?: string; e2e?: string }>;
}) {
  const session = await getOptionalCurrentSession();
  const userLabel =
    session?.user.displayName?.trim() ||
    session?.user.email?.split("@")[0] ||
    null;

  const params = await searchParams;
  const jar = await cookies();
  const skipLoader = shouldSkipLandingLoader({
    introQuery: params.intro ?? null,
    seenCookie: jar.get(LANDING_INTRO_SEEN_COOKIE)?.value ?? null,
  });

  return (
    <Suspense fallback={null}>
      <LandingEntry userLabel={userLabel} skipLoader={skipLoader} />
    </Suspense>
  );
}
