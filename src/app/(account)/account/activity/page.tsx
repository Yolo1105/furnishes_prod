import type { Metadata } from "next";
import { ActivityPage } from "@/features/account/activity/ActivityPage";
import { listAccountActivity } from "@/server/account/activity";
import { requireCurrentSession } from "@/server/auth/session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "History",
};

export default async function AccountActivityRoute() {
  const session = await requireCurrentSession();
  const items = await listAccountActivity(session.user.id);
  return <ActivityPage items={items} />;
}
