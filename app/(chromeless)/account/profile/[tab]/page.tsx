import { notFound } from "next/navigation";
import { resolveSession } from "@/lib/auth/resolve-session";
import { AccountShell } from "@/components/eva-dashboard/account/account-shell";
import { ToastProvider } from "@/components/eva-dashboard/account/shared";
import { ProfileIdentityView } from "@/components/eva-dashboard/account/views/profile-identity-view";
import { ProfileHomeView } from "@/components/eva-dashboard/account/views/profile-home-view";
import { AddressBookView } from "@/components/eva-dashboard/account/views/address-book-view";
import { PaymentMethodsView } from "@/components/eva-dashboard/account/views/payment-methods-view";
import { ContactPrefsView } from "@/components/eva-dashboard/account/views/contact-prefs-view";
import {
  getAccountHomeState,
  getAccountIdentityState,
} from "@/lib/site/account/server/profile";
type Tab = "identity" | "home" | "addresses" | "payment" | "contact";
const VALID_TABS: readonly Tab[] = [
  "identity",
  "home",
  "addresses",
  "payment",
  "contact",
] as const;

/**
 * Consolidated profile sub-route — /account/profile/{identity|home|addresses|payment|contact}
 *
 * Replaces 5 identical ~15-line page wrappers with one dynamic route.
 * If the tab segment is unknown, 404s (Next.js notFound).
 */
export default async function ProfileTabPage({
  params,
}: {
  params: Promise<{ tab: string }>;
}) {
  const { tab } = await params;
  if (!(VALID_TABS as readonly string[]).includes(tab)) notFound();

  const resolved = await resolveSession();
  const userId = resolved.user.id;
  const identityInitial =
    tab === "identity" ? await getAccountIdentityState(userId) : undefined;
  const homeInitial =
    tab === "home" ? await getAccountHomeState(userId) : undefined;

  return (
    <ToastProvider>
      <AccountShell>
        {tab === "identity" && identityInitial && (
          <ProfileIdentityView initial={identityInitial} />
        )}
        {tab === "home" && homeInitial && (
          <ProfileHomeView initial={homeInitial} />
        )}
        {tab === "addresses" && <AddressBookView />}
        {tab === "payment" && <PaymentMethodsView />}
        {tab === "contact" && <ContactPrefsView />}
      </AccountShell>
    </ToastProvider>
  );
}

export async function generateStaticParams() {
  return VALID_TABS.map((tab) => ({ tab }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tab: string }>;
}) {
  const { tab } = await params;
  const titles: Record<string, string> = {
    identity: "Identity",
    home: "Your home",
    addresses: "Addresses",
    payment: "Payment methods",
    contact: "Contact preferences",
  };
  return {
    title: `${titles[tab] ?? "Profile"} — Furnishes Studio`,
  };
}
