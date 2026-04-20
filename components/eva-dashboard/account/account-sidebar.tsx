"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ACCOUNT_NAV_GROUPS,
  getAccountSidebarHeadline,
} from "@/lib/site/account/nav-config";

type Props = {
  counts?: Record<string, number>;
};

export function AccountSidebar({ counts = {} }: Props) {
  const pathname = usePathname() ?? "/account";
  const headline = getAccountSidebarHeadline(pathname);

  return (
    <aside
      aria-label="Account navigation"
      className="border-border bg-card flex h-full min-h-0 w-64 shrink-0 flex-col overflow-hidden border"
    >
      <div
        key={pathname}
        className="border-border text-foreground flex h-[60px] shrink-0 items-center border-b px-5 pt-3 pb-2"
        aria-live="polite"
      >
        <p
          className="line-clamp-2 min-w-0 flex-1 text-[13px] leading-[1.3] font-medium"
          title={headline}
        >
          {headline}
        </p>
      </div>

      {/* Nav — scrollable middle (min-h-0 so flex allows inner scroll; scrollbar hidden in account-theme) */}
      <nav className="account-sidebar-scroll min-h-0 flex-1 overflow-y-auto py-3">
        {ACCOUNT_NAV_GROUPS.map((group) => (
          <div key={group.id} className="mb-4">
            <div
              className="font-ui mb-1 px-5 text-[10px] tracking-[0.2em] uppercase"
              style={{ color: "var(--muted-foreground)" }}
            >
              {group.label}
            </div>

            <ul>
              {group.items.map((item) => {
                const href = item.slug ? `/account/${item.slug}` : "/account";
                const active =
                  (item.slug === "" && pathname === "/account") ||
                  (item.slug !== "" && pathname.startsWith(href));
                return (
                  <li key={item.slug || "dashboard"}>
                    <SidebarNavRow
                      href={href}
                      label={item.label}
                      Icon={item.icon}
                      active={active}
                      soonPill={item.soonPill}
                      count={item.countKey ? counts[item.countKey] : undefined}
                    />
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}

function SidebarNavRow({
  href,
  label,
  Icon,
  active,
  soonPill,
  count,
}: {
  href: string;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  active: boolean;
  soonPill?: boolean;
  count?: number;
}) {
  const baseStyle: React.CSSProperties = {
    background: active ? "var(--primary)" : "transparent",
    color: active ? "var(--primary-foreground)" : "var(--foreground)",
  };

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className="font-ui my-px flex items-center gap-2.5 px-5 py-1.5 text-[12.5px] transition-colors"
      style={baseStyle}
      onMouseEnter={(e) => {
        if (!active) {
          (e.currentTarget as HTMLElement).style.background =
            "var(--accent-soft)";
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          (e.currentTarget as HTMLElement).style.background = "transparent";
        }
      }}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="flex-1 truncate">{label}</span>
      {soonPill ? (
        <span
          className="font-ui border px-1.5 py-0.5 text-[9px] tracking-[0.18em] uppercase"
          style={{
            borderColor: active ? "rgba(255,255,255,0.35)" : "var(--border)",
            color: active
              ? "rgba(255,255,255,0.85)"
              : "var(--muted-foreground)",
          }}
        >
          Soon
        </span>
      ) : typeof count === "number" && count > 0 ? (
        <span
          className="font-ui text-[10px] tabular-nums"
          style={{
            color: active
              ? "rgba(255,255,255,0.78)"
              : "var(--muted-foreground)",
          }}
        >
          {count.toString().padStart(2, "0")}
        </span>
      ) : null}
    </Link>
  );
}
