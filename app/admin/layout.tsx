import type { Metadata } from "next";
import Link from "next/link";
import { LifeBuoy, ArrowLeft, Shield } from "lucide-react";
import { requireStaff } from "@/lib/auth/require-staff";
import "../(chromeless)/account/account-theme.css";

export const metadata: Metadata = {
  title: "Admin — Furnishes",
  robots: { index: false, follow: false },
};

/**
 * Admin layout — wraps all /admin/* pages.
 *
 * requireStaff() runs at every layout render so the auth check can't
 * be bypassed by direct navigation. Redirects on insufficient role.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const staff = await requireStaff();

  return (
    <div
      className="eva-dashboard-root"
      style={{
        minHeight: "100vh",
        background: "var(--background)",
        color: "var(--foreground)",
      }}
    >
      <header
        className="border-b"
        style={{
          background: "var(--card)",
          borderColor: "var(--border)",
        }}
      >
        <div className="mx-auto flex w-full max-w-[1320px] items-center justify-between px-6 py-4 sm:px-8 lg:px-10">
          <div className="flex items-center gap-6">
            <Link
              href="/admin/support"
              className="font-ui text-[10.5px] tracking-[0.22em] uppercase"
              style={{ color: "var(--foreground)" }}
            >
              FURNISHES <span style={{ color: "var(--primary)" }}>|</span>{" "}
              <span style={{ color: "var(--muted-foreground)" }}>ADMIN</span>
            </Link>

            <nav className="flex items-center gap-4">
              <Link
                href="/admin/support"
                className="font-ui inline-flex items-center gap-1.5 text-[10.5px] tracking-[0.18em] uppercase transition-opacity hover:opacity-80"
                style={{ color: "var(--foreground)" }}
              >
                <LifeBuoy className="h-3 w-3" />
                Support
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <span
              className="font-ui inline-flex items-center gap-1.5 border px-2 py-1 text-[10px] tracking-[0.16em] uppercase"
              style={{
                color: "var(--primary)",
                borderColor: "var(--primary)",
              }}
            >
              <Shield className="h-3 w-3" />
              {staff.role}
            </span>
            <span
              className="font-ui text-[11px]"
              style={{ color: "var(--muted-foreground)" }}
            >
              {staff.email}
            </span>
            <Link
              href="/account"
              className="font-ui inline-flex items-center gap-1.5 text-[10px] tracking-[0.18em] uppercase transition-opacity hover:opacity-80"
              style={{ color: "var(--muted-foreground)" }}
            >
              <ArrowLeft className="h-3 w-3" />
              Exit admin
            </Link>
          </div>
        </div>
      </header>

      <main>{children}</main>
    </div>
  );
}
