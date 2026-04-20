import type { Metadata } from "next";
import "../(chromeless)/account/account-theme.css";
import { ToastProvider } from "@/components/eva-dashboard/account/shared";
import { StudioStyleSiteHeader } from "@/components/commerce/studio-style-site-header";

export const metadata: Metadata = {
  title: "Cart — Furnishes",
};

export default function CartLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="eva-dashboard-root bg-muted text-foreground flex min-h-dvh flex-col overflow-hidden font-[var(--font-manrope)]">
      <ToastProvider>
        <StudioStyleSiteHeader />
        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden p-2 px-4">
          {children}
        </div>
      </ToastProvider>
    </div>
  );
}
