import type { Metadata } from "next";
import { currentUser } from "@clerk/nextjs/server";
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
  const clerkUser = process.env.CLERK_SECRET_KEY
    ? await currentUser().catch(() => null)
    : null;
  const clerkName = clerkUser
    ? [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ").trim()
    : "";

  return (
    <AccountShell
      commerceEnabled={isCommerceEnabled()}
      user={{
        email: session.user.email,
        displayName: clerkName || session.user.displayName,
        imageUrl: clerkUser?.imageUrl ?? null,
      }}
    >
      {children}
    </AccountShell>
  );
}
