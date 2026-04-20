"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  MessageSquare,
  LayoutGrid,
  Images,
  ShoppingBag,
  Menu,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  userInitials?: string;
  cartCount?: number;
  onMenuClick?: () => void;
};

export function AccountNavbar({
  userInitials = "MT",
  cartCount = 0,
  onMenuClick,
}: Props) {
  const pathname = usePathname() ?? "";
  const isChat = pathname.startsWith("/chatbot");
  const isImageGen = pathname.startsWith("/account/image-gen");
  /** Account hub + all account pages except Image Gen */
  const isStudio =
    pathname.startsWith("/account") &&
    !isImageGen &&
    !pathname.startsWith("/chatbot");

  return (
    <header
      role="banner"
      className="border-border bg-card grid h-12 shrink-0 grid-cols-[auto_1fr_auto] items-center gap-3 border-b px-[var(--site-inline-gutter)] sm:grid-cols-[1fr_auto_1fr]"
    >
      {/* Left: hamburger (mobile) + brand */}
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Open navigation"
          className="inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center text-amber-800 transition-colors hover:text-amber-900 md:hidden"
        >
          <Menu className="h-4 w-4" />
        </button>

        <Link
          href="/"
          className="cursor-pointer truncate text-[11px] font-medium tracking-widest whitespace-nowrap text-amber-800 uppercase transition-colors hover:text-amber-900"
        >
          FURNISHES<span className="mx-1 text-amber-800">|</span>
          <span className="hidden sm:inline">STUDIO</span>
        </Link>
      </div>

      {/* Center: Studio | Image Gen | Chat */}
      <nav
        className="flex h-full max-w-full items-stretch justify-center gap-4 sm:gap-6 md:gap-8"
        aria-label="Workspace"
      >
        <TabLink
          href="/account"
          active={isStudio}
          icon={<LayoutGrid className="h-3.5 w-3.5 shrink-0" />}
          label="Studio"
        />
        <TabLink
          href="/account/image-gen"
          active={isImageGen}
          icon={<Images className="h-3.5 w-3.5 shrink-0" />}
          label="Image Gen"
        />
        <TabLink
          href="/chatbot"
          active={isChat}
          icon={<MessageSquare className="h-3.5 w-3.5 shrink-0" />}
          label="Chat"
        />
      </nav>

      {/* Right: cart + avatar */}
      <div className="flex items-center gap-2 justify-self-end sm:gap-3">
        <Link
          href="/cart"
          aria-label={`Cart (${cartCount} items)`}
          className="relative inline-flex h-8 w-8 cursor-pointer items-center justify-center text-amber-800 transition-colors hover:text-amber-900"
        >
          <ShoppingBag className="h-4 w-4" />
          {cartCount > 0 && (
            <span
              aria-hidden="true"
              className="font-ui absolute -top-0.5 -right-0.5 inline-flex h-4 min-w-[16px] items-center justify-center px-1 text-[9px] tabular-nums"
              style={{
                background: "var(--primary)",
                color: "var(--primary-foreground)",
              }}
            >
              {cartCount > 99 ? "99+" : cartCount}
            </span>
          )}
        </Link>

        <Link
          href="/account/profile"
          className="inline-flex cursor-pointer items-center justify-center p-1 text-amber-800 transition-colors hover:text-amber-900"
          aria-label="Profile"
        >
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-amber-800/25 bg-amber-50/90 text-[10px] font-medium tracking-wide text-amber-900">
            {userInitials}
          </span>
        </Link>
      </div>
    </header>
  );
}

function TabLink({
  href,
  active,
  icon,
  label,
}: {
  href: string;
  active: boolean;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "inline-flex h-full items-center gap-1.5 px-0.5 text-[11px] tracking-widest uppercase transition-colors",
        active
          ? "font-medium text-amber-900"
          : "cursor-pointer font-normal text-amber-800 hover:text-amber-900",
      )}
    >
      {icon}
      {label}
    </Link>
  );
}
