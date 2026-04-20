"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingBag, UserCircle } from "lucide-react";
import {
  NAV_ITEMS,
  CTA_NAV_LABEL,
  getMarketingNavActiveKey,
} from "@/content/site/nav";
import type { MarketingHeaderContext } from "@/lib/auth/marketing-header-context.types";
import { LOGIN_RETURN_TO_ACCOUNT } from "@/lib/auth/login-paths";
import { useRightNav } from "@/components/site/right-nav-context";
import { SlidingNavIcons } from "@/components/site/sliding-nav-icons";
import { cn } from "@/lib/utils";

/**
 * Full marketing nav (Collections … Studio … About) with badges + auth CTA,
 * styled like `AccountNavbar` (card bar, amber type) for commerce routes
 * outside the Studio shell (`/cart`, `/checkout`).
 */
export function StudioStyleSiteHeader() {
  const pathname = usePathname();
  const activeLink = getMarketingNavActiveKey(pathname);
  const { isNavExpanded, isSidebarOpen, toggleJourneyMenu, onNavIconClick } =
    useRightNav();

  const [headerCtx, setHeaderCtx] = useState<MarketingHeaderContext | null>(
    null,
  );
  useEffect(() => {
    let cancelled = false;
    fetch("/api/site/header-context", { cache: "no-store" })
      .then((res) => res.json())
      .then((data: MarketingHeaderContext) => {
        if (!cancelled) setHeaderCtx(data);
      })
      .catch(() => {
        if (!cancelled) {
          setHeaderCtx({
            signedIn: false,
            displayName: null,
            cartCount: 0,
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  return (
    <header
      role="banner"
      className="border-border bg-card grid h-12 shrink-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 border-b px-[var(--site-inline-gutter)] sm:gap-3"
    >
      <div className="flex min-w-0 items-center gap-3">
        <Link
          href="/"
          className="cursor-pointer truncate text-[11px] font-medium tracking-widest whitespace-nowrap text-amber-800 uppercase transition-colors hover:text-amber-900"
        >
          FURNISHES<span className="mx-1 text-amber-800">|</span>
          <span className="hidden sm:inline">STUDIO</span>
        </Link>
      </div>

      <nav
        className="flex min-h-0 min-w-0 items-stretch justify-start gap-4 overflow-x-auto py-1 [scrollbar-width:none] sm:justify-center sm:gap-6 sm:py-0 md:gap-8 [&::-webkit-scrollbar]:hidden"
        aria-label="Main"
      >
        {NAV_ITEMS.map((item) => {
          const resolvedHref =
            item.activeKey === "studio"
              ? headerCtx?.signedIn === true
                ? "/account"
                : LOGIN_RETURN_TO_ACCOUNT
              : item.href;
          const isActive = activeLink === item.activeKey;
          return (
            <Link
              key={item.name}
              href={resolvedHref}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 self-center text-[11px] tracking-widest whitespace-nowrap uppercase transition-colors",
                isActive
                  ? "font-medium text-amber-900"
                  : "font-normal text-amber-800 hover:text-amber-900",
              )}
            >
              {item.name}
              {item.badge ? (
                <span className="inline-flex items-baseline gap-0 font-normal">
                  <span className="text-amber-600">[</span>
                  <span className="text-amber-800 tabular-nums">
                    {item.badge.slice(1, -1)}
                  </span>
                  <span className="text-amber-600">]</span>
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      <div className="flex min-w-0 items-center justify-end gap-2 justify-self-end sm:gap-3">
        {headerCtx?.signedIn ? (
          <>
            <Link
              href="/cart"
              className="relative inline-flex h-8 w-8 shrink-0 items-center justify-center text-amber-800 transition-colors hover:text-amber-900"
              aria-label={`Cart (${headerCtx.cartCount} items)`}
            >
              <ShoppingBag className="h-4 w-4" strokeWidth={1.5} />
              {headerCtx.cartCount > 0 && (
                <span
                  aria-hidden
                  className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded px-1 text-[9px] font-medium text-white tabular-nums"
                  style={{
                    background: "var(--primary)",
                    color: "var(--primary-foreground)",
                  }}
                >
                  {headerCtx.cartCount > 99 ? "99+" : headerCtx.cartCount}
                </span>
              )}
            </Link>
            <Link
              href="/account/profile"
              className="inline-flex h-8 w-8 cursor-pointer items-center justify-center text-amber-800 transition-colors hover:text-amber-900"
              aria-label={
                headerCtx.displayName
                  ? `Profile — ${headerCtx.displayName}`
                  : "Profile"
              }
              title={headerCtx.displayName ?? "Account"}
            >
              <UserCircle className="h-7 w-7" strokeWidth={1.5} aria-hidden />
            </Link>
          </>
        ) : (
          <div className="relative flex flex-col items-end">
            <button
              type="button"
              onClick={toggleJourneyMenu}
              className="cursor-pointer border-0 bg-transparent p-0 text-left text-amber-800 transition-colors hover:text-amber-900"
              aria-expanded={isNavExpanded}
              aria-label={`${CTA_NAV_LABEL}, open journey menu`}
            >
              <span className="inline-flex items-center gap-1 text-[11px] tracking-widest">
                <span className="text-amber-600">[</span>
                <span className="lowercase">{CTA_NAV_LABEL}</span>
                <span className="text-amber-600">]</span>
              </span>
            </button>
            <div
              className="absolute top-full right-0 z-[55] mt-4 flex flex-col items-end"
              aria-hidden={!isNavExpanded && !isSidebarOpen}
            >
              <SlidingNavIcons
                isExpanded={isNavExpanded}
                isSidebarOpen={isSidebarOpen}
                onIconClick={onNavIconClick}
                theme="dark"
              />
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
