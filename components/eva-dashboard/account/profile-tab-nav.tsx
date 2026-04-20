"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PROFILE_TABS } from "@/lib/site/account/profile-tabs";

/**
 * Horizontal tab bar for /account/profile/* sub-routes.
 * Same orange-underline pattern as the Studio/Chat nav and checkout steps.
 */
export function ProfileTabNav() {
  const pathname = usePathname() ?? "/account/profile";
  const activeSlug = pathname.split("/")[3] ?? "identity";

  return (
    <nav
      aria-label="Profile sections"
      className="mb-8 flex flex-wrap items-stretch gap-6 border-b"
      style={{ borderColor: "var(--border)" }}
    >
      {PROFILE_TABS.map((tab) => {
        const active = tab.slug === activeSlug;
        const Icon = tab.icon;
        return (
          <Link
            key={tab.slug}
            href={`/account/profile/${tab.slug}`}
            aria-current={active ? "page" : undefined}
            className="font-ui inline-flex items-center gap-2 py-3 text-[11px] tracking-[0.14em] uppercase transition-colors"
            style={{
              color: active ? "var(--foreground)" : "var(--muted-foreground)",
              fontWeight: active ? 600 : 500,
              borderBottom: `2px solid ${active ? "var(--primary)" : "transparent"}`,
              marginBottom: "-1px",
            }}
          >
            <Icon className="h-3.5 w-3.5" />
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
