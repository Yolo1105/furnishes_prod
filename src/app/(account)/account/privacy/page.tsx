import type { Metadata } from "next";
import { PrivacyPage } from "@/features/account/profile/PrivacyPage";
import { getMemoryEnabled } from "@/server/account/privacy";
import { requireCurrentSession } from "@/server/auth/session";

export const dynamic = "force-dynamic";

export default async function AccountPrivacyRoute() {
  const session = await requireCurrentSession();
  const memoryEnabled = await getMemoryEnabled(session.user.id);

  return <PrivacyPage initialMemoryEnabled={memoryEnabled} />;
}

export const metadata: Metadata = {
  title: "Eva's Memory & Data",
};
