import { cookies } from "next/headers";
import { Suspense } from "react";
import { LandingEntry } from "@/features/landing/LandingEntry";
import {
  hasSeenLandingIntroCookie,
  LANDING_INTRO_SEEN_COOKIE,
} from "@/features/landing/landing-intro";
import { getOptionalCurrentSession } from "@/server/auth/session";

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
  const querySkip = params.intro === "skip";
  const jar = await cookies();
  const skipLoader =
    querySkip ||
    hasSeenLandingIntroCookie(jar.get(LANDING_INTRO_SEEN_COOKIE)?.value);

  return (
    <Suspense fallback={null}>
      <LandingEntry userLabel={userLabel} skipLoader={skipLoader} />
    </Suspense>
  );
}
