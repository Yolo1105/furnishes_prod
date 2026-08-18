import type { Metadata } from "next";
import { AccountShell } from "@/features/account/shell/AccountShell";
import { requireCurrentSession } from "@/server/auth/session";
import { isCommerceEnabled } from "@/server/commerce/commerce-config";
import "@/features/account/shell/account-studio.css";

export const metadata: Metadata = {
  title: {
    template: "%s · Furnishes Studio",
    default: "Account · Furnishes Studio",
  },
};

export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireCurrentSession();

  return (
    <AccountShell
      commerceEnabled={isCommerceEnabled()}
      user={{
        email: session.user.email,
        displayName: session.user.displayName,
      }}
    >
      {children}
    </AccountShell>
  );
}
