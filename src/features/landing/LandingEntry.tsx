"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { LandingPage } from "./LandingPage";
import { migrateLandingIntroSeenFromLocalStorage } from "./landing-intro";

/**
 * Client-side reader for the two test-only query params, so the `/` route
 * stays statically renderable. `e2e=1` only takes effect when the build was
 * made with NEXT_PUBLIC_E2E=1 — never from the query alone in production.
 *
 * Loader skip comes from the server (cookie) so SSR matches the client.
 * Hero open (small→large) still runs unless `?intro=skip` (E2E).
 */
export function LandingEntry({
  userLabel = null,
  skipLoader: skipLoaderFromServer = false,
}: {
  userLabel?: string | null;
  skipLoader?: boolean;
}) {
  const params = useSearchParams();
  const querySkip = params.get("intro") === "skip";
  const skipLoader = querySkip || skipLoaderFromServer;
  /** Only E2E settled-state skips the hero camera open. */
  const skipIntro = querySkip;
  const e2eMode =
    process.env.NEXT_PUBLIC_E2E === "1" && params.get("e2e") === "1";

  useEffect(() => {
    migrateLandingIntroSeenFromLocalStorage();
  }, []);

  return (
    <LandingPage
      skipLoader={skipLoader}
      skipIntro={skipIntro}
      e2eMode={e2eMode}
      userLabel={userLabel}
    />
  );
}
