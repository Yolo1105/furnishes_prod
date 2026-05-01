import Link from "next/link";
import { ArrowLeft, Home } from "lucide-react";
import { AccountShell } from "@/components/eva-dashboard/account/account-shell";
import {
  ToastProvider,
  Eyebrow,
} from "@/components/eva-dashboard/account/shared";
export default function AccountNotFound() {
  return (
    <ToastProvider>
      <AccountShell>
        <div className="mx-auto flex min-h-[60vh] max-w-[640px] flex-col items-center justify-center px-6 py-16 text-center">
          <Eyebrow>PAGE NOT FOUND</Eyebrow>
          <h1
            className="font-display mt-5 text-4xl"
            style={{ color: "var(--foreground)" }}
          >
            This page doesn&apos;t exist in Studio
          </h1>
          <p
            className="font-body mt-3 max-w-md text-sm"
            style={{ color: "var(--muted-foreground)" }}
          >
            You may have followed a stale link, or the page may have moved. Head
            to the dashboard and pick up from there.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/account"
              className="font-ui inline-flex items-center gap-2 border px-4 py-2 text-[10.5px] tracking-[0.14em] uppercase"
              style={{
                background: "var(--primary)",
                color: "var(--primary-foreground)",
                borderColor: "var(--primary)",
              }}
            >
              <Home className="h-3.5 w-3.5" />
              Studio dashboard
            </Link>
            <Link
              href="/"
              className="font-ui inline-flex items-center gap-2 border px-4 py-2 text-[10.5px] tracking-[0.14em] uppercase"
              style={{
                background: "var(--card)",
                color: "var(--foreground)",
                borderColor: "var(--border-strong)",
              }}
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to furnishes.sg
            </Link>
          </div>
        </div>
      </AccountShell>
    </ToastProvider>
  );
}
