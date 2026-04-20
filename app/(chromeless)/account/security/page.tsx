import { cookies } from "next/headers";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { AccountShell } from "@/components/eva-dashboard/account/account-shell";
import { ToastProvider } from "@/components/eva-dashboard/account/shared";
import { SecurityView } from "@/components/eva-dashboard/account/views/security-view";
import type { SecurityEventKind } from "@prisma/client";
import type { SecurityEvent, SessionRow } from "@/lib/site/account/types";

async function sessionTokenFromCookies(): Promise<string | undefined> {
  const c = await cookies();
  return (
    c.get("authjs.session-token")?.value ??
    c.get("__Secure-authjs.session-token")?.value ??
    c.get("next-auth.session-token")?.value ??
    c.get("__Secure-next-auth.session-token")?.value
  );
}

function mapSecurityKind(kind: SecurityEventKind): SecurityEvent["kind"] {
  const m: Record<SecurityEventKind, SecurityEvent["kind"]> = {
    login: "sign-in",
    login_failed: "sign-in",
    two_factor_enabled: "2fa-enabled",
    two_factor_disabled: "2fa-disabled",
    password_change: "password-change",
    session_revoked: "sign-out",
    new_device: "new-device",
  };
  return m[kind];
}

export default async function Page() {
  const session = await auth();
  let initialSessions: SessionRow[] | undefined;
  let initialEvents: SecurityEvent[] | undefined;

  if (session?.user?.id) {
    const token = await sessionTokenFromCookies();
    const [sessionRows, eventRows] = await Promise.all([
      prisma.session.findMany({
        where: { userId: session.user.id },
        orderBy: { expires: "desc" },
        take: 10,
      }),
      prisma.securityEvent.findMany({
        where: { userId: session.user.id },
        orderBy: { at: "desc" },
        take: 20,
      }),
    ]);

    initialSessions = sessionRows.map((s) => ({
      id: s.id,
      deviceLabel: "Browser session",
      browser: "Web",
      ip: "—",
      city: "—",
      country: "—",
      lastActive: s.expires.toISOString(),
      current: token != null && s.sessionToken === token,
    }));

    initialEvents = eventRows.map((e) => ({
      id: e.id,
      kind: mapSecurityKind(e.kind),
      ok: e.ok,
      description: e.description,
      city: e.city ?? "—",
      country: e.country ?? "—",
      at: e.at.toISOString(),
    }));
  }

  return (
    <ToastProvider>
      <AccountShell>
        <SecurityView
          initialSessions={initialSessions}
          initialEvents={initialEvents}
        />
      </AccountShell>
    </ToastProvider>
  );
}
