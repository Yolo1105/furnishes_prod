import type { Metadata } from "next";
import { UploadsPage } from "@/features/account/uploads/UploadsPage";
import { listUploads } from "@/server/uploads/service";
import { requireCurrentSession } from "@/server/auth/session";

export const dynamic = "force-dynamic";

export default async function AccountUploadsRoute() {
  const session = await requireCurrentSession();
  const items = await listUploads(session.user.id);
  return <UploadsPage initialItems={items} />;
}

export const metadata: Metadata = {
  title: "Uploads",
};
