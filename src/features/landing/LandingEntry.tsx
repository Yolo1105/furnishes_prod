"use client";

import { useEffect, useSyncExternalStore } from "react";
import { LandingPage } from "./LandingPage";
import {
  forgetPersistentIntroSeen,
  hasSeenLandingIntroThisVisit,
  markLandingIntroSeen,
} from "./landing-intro";

function subscribeIntroSeen() {
  return () => {};
}

function getIntroSeenSnapshot() {
  return hasSeenLandingIntroThisVisit();
}

function getIntroSeenServerSnapshot() {
  return false;
}

/**
 * Client gate for the first-visit loader. Skip is per tab (sessionStorage).
 * Closing the page clears it so the intro plays again. `?intro=skip` is E2E only.
 *
 * Query flags come from the server page so this tree does not suspend on
 * `useSearchParams` (that left quiz→home under a blank Suspense fallback).
 *
 * Skip must be known on the first client render of a SPA return. Waiting until
 * useLayoutEffect left /quiz → / on the 00% loader with the house unmounted.
 */
export function LandingEntry({
  userLabel = null,
  skipLoader: skipLoaderFromServer = false,
  skipIntro: skipIntroFromServer = false,
  replay = false,
  e2eMode = false,
}: {
  userLabel?: string | null;
  skipLoader?: boolean;
  skipIntro?: boolean;
  replay?: boolean;
  e2eMode?: boolean;
}) {
  const seenThisVisit = useSyncExternalStore(
    subscribeIntroSeen,
    getIntroSeenSnapshot,
    getIntroSeenServerSnapshot,
  );
  const skipIntro = skipIntroFromServer;
  const skipLoader = !replay && (skipLoaderFromServer || seenThisVisit);

  useEffect(() => {
    forgetPersistentIntroSeen();
  }, []);

  useEffect(() => {
    const rememberVisitBeforeLeaving = () => markLandingIntroSeen();
    window.addEventListener(
      "furnishes:route-handoff-start",
      rememberVisitBeforeLeaving,
    );
    return () => {
      window.removeEventListener(
        "furnishes:route-handoff-start",
        rememberVisitBeforeLeaving,
      );
    };
  }, []);

  return (
    <LandingPage
      skipLoader={skipLoader}
      skipIntro={skipIntro || skipLoader}
      e2eMode={e2eMode}
      userLabel={userLabel}
    />
  );
}
