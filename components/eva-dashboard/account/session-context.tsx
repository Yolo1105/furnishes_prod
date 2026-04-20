"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { SessionCounts } from "@/lib/site/account/shell-counts";

/**
 * Session context — the data every account-shell page needs.
 *
 * Replaces the prop-drilling pattern where each page wrapper computed
 * userInitials/counts/cartCount and passed them down through AccountShell.
 *
 * Server components fetch the data once at the layout level and feed
 * this provider; client components consume via useSession().
 */

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  /** Computed: first 2 letters of name, uppercase */
  initials: string;
};

export type { SessionCounts };

export type SessionContextValue = {
  user: SessionUser;
  counts: SessionCounts;
  cartCount: number;
  /** True when this is the mock-auth bypass session (dev/demo only) */
  isMock: boolean;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error(
      "useSession must be used within <SessionProvider>. " +
        "Wrap your page in AccountShell or render through the account layout.",
    );
  }
  return ctx;
}

/**
 * Optional variant — returns null when no session, doesn't throw.
 * Useful for components that work with or without auth.
 */
export function useOptionalSession(): SessionContextValue | null {
  return useContext(SessionContext);
}

export function SessionProvider({
  user,
  counts,
  cartCount,
  isMock = false,
  children,
}: {
  user: Omit<SessionUser, "initials"> & { initials?: string };
  counts: SessionCounts;
  cartCount: number;
  isMock?: boolean;
  children: ReactNode;
}) {
  const value = useMemo<SessionContextValue>(() => {
    const initials =
      user.initials ??
      (user.name
        .split(" ")
        .map((p) => p[0])
        .filter(Boolean)
        .slice(0, 2)
        .join("")
        .toUpperCase() ||
        "··");
    return {
      user: { ...user, initials },
      counts,
      cartCount,
      isMock,
    };
  }, [user, counts, cartCount, isMock]);

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}
