import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import "../(chromeless)/account/account-theme.css";
import { ToastProvider } from "@/components/eva-dashboard/account/shared";
import { StudioStyleSiteHeader } from "@/components/commerce/studio-style-site-header";

export const metadata: Metadata = {
  title: "Checkout — Furnishes",
};

export default async function CheckoutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    const h = await headers();
    const pathname = h.get("x-pathname") ?? "/checkout/shipping";
    redirect(`/login?next=${encodeURIComponent(pathname)}`);
  }

  return (
    <div className="eva-dashboard-root bg-muted text-foreground flex min-h-dvh flex-col overflow-hidden font-[var(--font-manrope)]">
      <ToastProvider>
        <StudioStyleSiteHeader />
        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden p-2 px-4">
          <main className="account-main-scroll border-border bg-card min-h-0 flex-1 overflow-y-auto border">
            {children}
          </main>
        </div>
      </ToastProvider>
    </div>
  );
}
