import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { resolveSession } from "@/lib/auth/resolve-session";
import { SessionProvider } from "@/components/eva-dashboard/account/session-context";
import { isMockAuthEnabled } from "@/lib/auth/mock-auth";
import { LOGIN_RETURN_TO_ACCOUNT } from "@/lib/auth/login-paths";

import "./account-theme.css";

export const metadata: Metadata = {
  title: "Studio — Furnishes",
  description: "Your design workspace.",
};

/**
 * Auth gate for /account/*.
 *
 * Sign-in paths:
 *   1. Real Auth.js session (Credentials or Google) via auth()
 *   2. Mock cookie 'furnishes-mock-auth=1' — when isMockAuthEnabled()
 *      (non-prod by default; in production only if ALLOW_MOCK_AUTH=1 server-side).
 *
 * In real production without ALLOW_MOCK_AUTH, only real sessions pass.
 *
 * Once auth passes, fetches session data ONCE here and provides it to
 * the entire account tree via SessionProvider. Page wrappers no longer
 * need to fetch user/counts/cart separately.
 */
export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const mockAllowed = isMockAuthEnabled();

  const cookieStore = await cookies();
  const hasMockCookie =
    mockAllowed && cookieStore.get("furnishes-mock-auth")?.value === "1";

  if (!hasMockCookie) {
    try {
      const session = await auth();
      if (!session?.user) {
        redirect(LOGIN_RETURN_TO_ACCOUNT);
      }
    } catch {
      if (!mockAllowed) {
        redirect(LOGIN_RETURN_TO_ACCOUNT);
      }
    }
  }

  // Fetch session data once for the entire shell
  const resolved = await resolveSession();

  return (
    <div className="eva-dashboard-root bg-muted text-foreground h-dvh min-h-0 overflow-hidden">
      <SessionProvider
        user={resolved.user}
        counts={resolved.counts}
        cartCount={resolved.cartCount}
        isMock={resolved.isMock}
      >
        {children}
      </SessionProvider>
    </div>
  );
}
