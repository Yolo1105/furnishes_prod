import type { Metadata } from "next";
import { SettingsPage } from "@/features/account/profile/SettingsPage";
import { accountDisplayParts } from "@/features/account/shell/account-display";
import { getNotificationPrefs } from "@/server/account/settings";
import {
  listActiveSessions,
  requireCurrentSession,
} from "@/server/auth/session";

export const dynamic = "force-dynamic";

export default async function AccountSettingsRoute() {
  const session = await requireCurrentSession();
  const [prefs, sessions] = await Promise.all([
    getNotificationPrefs(session.user.id),
    listActiveSessions(session.user.id, session.sessionId),
  ]);
  const { full } = accountDisplayParts(
    session.user.displayName,
    session.user.email,
  );
  const memberSince = new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "numeric",
  }).format(session.user.createdAt);

  return (
    <SettingsPage
      displayName={full}
      email={session.user.email}
      memberSince={memberSince}
      initialPrefs={prefs}
      initialSessions={sessions}
    />
  );
}

export const metadata: Metadata = {
  title: "Profile",
};
