"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageCircleQuestion, Megaphone } from "lucide-react";

export function SupportTabNav() {
  const pathname = usePathname() ?? "";
  const isHelp =
    pathname === "/account/support" ||
    pathname.startsWith("/account/support/help");
  const isFeedback = pathname.startsWith("/account/support/feedback");

  return (
    <nav
      aria-label="Support tabs"
      className="mb-8 flex flex-wrap items-stretch gap-6 border-b"
      style={{ borderColor: "var(--border)" }}
    >
      <Tab
        href="/account/support/help"
        active={isHelp}
        Icon={MessageCircleQuestion}
        label="Get help"
      />
      <Tab
        href="/account/support/feedback"
        active={isFeedback}
        Icon={Megaphone}
        label="Share feedback"
      />
    </nav>
  );
}

function Tab({
  href,
  active,
  Icon,
  label,
}: {
  href: string;
  active: boolean;
  Icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <Link
      href={href}
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
      {label}
    </Link>
  );
}
