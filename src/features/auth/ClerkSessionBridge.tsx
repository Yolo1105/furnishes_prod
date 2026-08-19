"use client";

import { useAuth } from "@clerk/nextjs";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

const SKIP = new Set(["/login", "/signup", "/sso-callback"]);

/** Mint the app cookie if Clerk is already signed in on a public page. */
export function ClerkSessionBridge() {
  const { isLoaded, isSignedIn } = useAuth();
  const pathname = usePathname();
  const syncedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      syncedFor.current = null;
      return;
    }
    if (SKIP.has(pathname) || syncedFor.current === "signed-in") return;
    syncedFor.current = "signed-in";
    void fetch("/api/auth/clerk-sync", {
      method: "POST",
      credentials: "include",
    });
  }, [isLoaded, isSignedIn, pathname]);

  return null;
}
