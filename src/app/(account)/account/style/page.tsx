import type { Metadata } from "next";
import { StylePage } from "@/features/account/profile/StylePage";
import { getFullStyleProfile } from "@/server/account/style-profile";
import { requireCurrentSession } from "@/server/auth/session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Style Profile",
};

export default async function AccountStyleRoute() {
  const session = await requireCurrentSession();
  const profile = await getFullStyleProfile(session.user.id);

  return (
    <StylePage
      key={profile.propertyType}
      initialPropertyType={profile.propertyType}
      heroLabel={profile.heroLabel}
      heroSummary={profile.heroSummary}
    />
  );
}
