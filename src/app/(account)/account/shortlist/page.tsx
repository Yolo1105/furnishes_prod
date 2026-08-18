import type { Metadata } from "next";
import { InspirationPage } from "@/features/account/inspiration/InspirationPage";
import { listInspirationItems } from "@/server/inspiration/inspiration-service";
import { requireCurrentSession } from "@/server/auth/session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Explore",
};

/** Alias of Inspiration Board (commerce shortlist deferred). */
export default async function AccountShortlistRoute() {
  const session = await requireCurrentSession();
  const { items } = await listInspirationItems(session.user.id);
  return <InspirationPage initialItems={items} />;
}
