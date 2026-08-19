"use client";

import { useLayoutEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { LandingPage } from "./LandingPage";
import {
  forgetPersistentIntroSeen,
  hasSeenLandingIntroThisVisit,
  isLandingIntroReplayQuery,
  shouldSkipLandingLoader,
} from "./landing-intro";

/**
 * Client gate for the first-visit loader. Skip is per tab (sessionStorage).
 * Closing the page clears it so the intro plays again. `?intro=skip` is E2E only.
 */
export function LandingEntry({
  userLabel = null,
  skipLoader: skipLoaderFromServer = false,
}: {
  userLabel?: string | null;
  skipLoader?: boolean;
}) {
  const params = useSearchParams();
  const introQuery = params.get("intro");
  const replay = isLandingIntroReplayQuery(introQuery);
  const skipIntro = shouldSkipLandingLoader({ introQuery });
  const e2eMode =
    process.env.NEXT_PUBLIC_E2E === "1" && params.get("e2e") === "1";
  const [skipLoader, setSkipLoader] = useState(skipLoaderFromServer);

  useLayoutEffect(() => {
    forgetPersistentIntroSeen();
    if (replay) {
      setSkipLoader(false);
      return;
    }
    setSkipLoader(skipIntro || hasSeenLandingIntroThisVisit());
  }, [replay, skipIntro]);

  return (
    <LandingPage
      skipLoader={skipLoader}
      skipIntro={skipIntro}
      e2eMode={e2eMode}
      userLabel={userLabel}
    />
  );
}
