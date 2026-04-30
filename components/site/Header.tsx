"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingBag, UserCircle } from "lucide-react";
import {
  NAV_ITEMS,
  CTA_NAV_LABEL,
  SITE_TITLE_LINES,
  getMarketingNavActiveKey,
  type HeaderActiveLink,
} from "@/content/site/nav";
import { useRightNav } from "@/components/site/right-nav-context";
/* Will be used somewhere else later: workspace rail hover + panel-open header tint. */
// import { useWorkspaceRailHover } from "@/components/shared/layout/sidebar/workspace-rail-hover";
// import { useSidebarOptional } from "@/components/shared/layout/sidebar";
import { SlidingNavIcons } from "@/components/site/sliding-nav-icons";
import { useFirstSectionNavTheme } from "@/hooks/site/useFirstSectionNavTheme";
import { isAuthMarketingSplitPath } from "@/lib/site/auth-marketing-paths";
import type { MarketingHeaderContext } from "@/lib/auth/marketing-header-context.types";
import { LOGIN_RETURN_TO_ACCOUNT } from "@/lib/auth/login-paths";
import styles from "./Header.module.css";

export type HeaderVariant = "fixed" | "sticky";
export type HeaderTheme = "light" | "dark";

export type HeaderProps = {
  variant: HeaderVariant;
  theme: HeaderTheme;
  firstSectionId?: string;
  activeLink?: HeaderActiveLink;
};

const [logoLine] = SITE_TITLE_LINES;
const LOGO_PARTS = logoLine
  ? logoLine.split(/\s*\|\s*/)
  : ["FURNISHES [ INTERIOR REVOLUTION ]"];

function MenuText({
  text,
  theme,
  lowercase,
  colorOverride,
  noShadow,
}: {
  text: string;
  theme: HeaderTheme;
  lowercase?: boolean;
  colorOverride?: string;
  noShadow?: boolean;
}) {
  const color =
    colorOverride ??
    (theme === "light" ? "var(--color-light-text)" : "var(--color-primary)");
  const chars = useMemo(() => text.split(""), [text]);
  return (
    <span
      className={`${styles.menuText} ${noShadow ? styles.navOrangeNoShadow : ""}`}
      style={lowercase ? { textTransform: "lowercase" } : undefined}
    >
      {chars.map((char, i) => (
        <span
          key={i}
          className={styles.menuChar}
          style={{ color, ["--char-index" as string]: i }}
        >
          {char}
        </span>
      ))}
    </span>
  );
}

/** Renders `before [inner]` with only the square brackets in accent orange. */
function LogoPartText({ part, theme }: { part: string; theme: HeaderTheme }) {
  const m = part.match(/^([^\[]+)\[([^\]]+)\]$/);
  if (!m) {
    return <MenuText text={part} theme={theme} />;
  }
  const [, before, inner] = m;
  const beforeText = before.trimEnd();
  const innerText = inner.trim();
  return (
    <>
      <MenuText text={beforeText} theme={theme} />
      <span className={styles.logoGap} aria-hidden />
      <MenuText
        text="["
        theme={theme}
        colorOverride="var(--color-accent)"
        noShadow
      />
      <span className={styles.logoGap} aria-hidden />
      <MenuText text={innerText} theme={theme} />
      <span className={styles.logoGap} aria-hidden />
      <MenuText
        text="]"
        theme={theme}
        colorOverride="var(--color-accent)"
        noShadow
      />
    </>
  );
}

export function Header({
  variant,
  theme,
  activeLink: activeLinkProp,
  firstSectionId,
}: HeaderProps) {
  const pathname = usePathname();
  const activeFromPath = getMarketingNavActiveKey(pathname);
  const activeLink = activeLinkProp ?? activeFromPath;
  const { isNavExpanded, isSidebarOpen, toggleJourneyMenu, onNavIconClick } =
    useRightNav();
  // Will be used somewhere else later (workspace rail):
  // const railHover = useWorkspaceRailHover();
  // const sidebarOptional = useSidebarOptional();
  // const workspacePanelOpen = !!(
  //   sidebarOptional?.panelOpen || sidebarOptional?.panelClosing
  // );

  const [headerCtx, setHeaderCtx] = useState<MarketingHeaderContext | null>(
    null,
  );
  /** Avoid hydration mismatch: scroll-based nav tone uses `document` and must not run until mount. */
  const [navMounted, setNavMounted] = useState(false);
  useEffect(() => {
    queueMicrotask(() => setNavMounted(true));
  }, []);

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

  /** Scroll-based light/dark only applies on the landing page (`#Home` / `#About` exist). */
  const path = pathname ?? "";
  const isHome = path === "/";
  const sectionTone = useFirstSectionNavTheme(
    isHome ? firstSectionId : undefined,
  );
  /** Cream/surface inner routes need dark nav copy; home hero uses `theme` until scroll tone applies. */
  const baseTheme: HeaderTheme = isHome ? theme : "dark";
  const effectiveTheme: HeaderTheme = !navMounted
    ? baseTheme
    : (sectionTone ?? baseTheme);

  const authMinimalHeader = isAuthMarketingSplitPath(pathname ?? null);
  /** Match landing hero wordmark: cream copy + shadow (theme `light`), not inner-page dark nav. */
  const headerLogoTheme: HeaderTheme = authMinimalHeader
    ? "light"
    : effectiveTheme;

  const headerGridCols = authMinimalHeader
    ? "grid-cols-1"
    : "grid-cols-[auto_minmax(0,1fr)_auto]";

  const iconStrokeColor =
    effectiveTheme === "dark"
      ? "var(--color-primary)"
      : "var(--color-light-text)";

  /** `auto` columns keep the wordmark on one line; center column absorbs width changes on laptop sizes. */
  const positionClass =
    variant === "fixed"
      ? `relative z-30 w-full grid ${headerGridCols} items-baseline gap-x-3 min-[1000px]:gap-x-5 xl:gap-x-6 px-[var(--site-inline-gutter)] pt-4 pb-5 md:pt-5 md:pb-6`
      : `sticky z-30 grid ${headerGridCols} items-baseline gap-x-3 min-[1000px]:gap-x-5 xl:gap-x-6 px-[var(--site-inline-gutter)] pt-4 pb-5 md:pt-5 md:pb-6 ${
          authMinimalHeader ? "top-0" : "top-[var(--utility-bar-height)]"
        }`;

  return (
    <header
      suppressHydrationWarning
      className={`${positionClass} font-nav tracking-wider transition-colors duration-[320ms] ease-out ${
        authMinimalHeader || effectiveTheme === "light"
          ? "text-[color:var(--color-light-text)]"
          : "text-foreground"
      } ${effectiveTheme === "dark" && !authMinimalHeader ? styles.navOverContent : ""}`}
    >
      <div
        className={`${styles.menuItemWrapper} ${styles.menuItemAnimated} shrink-0`}
        style={{ ["--animation-delay" as string]: "0s" }}
      >
        <Link href="/" className={styles.menuItem}>
          <span className={styles.siteTitleBlock}>
            <span className={styles.siteTitleLine}>
              {LOGO_PARTS.map((part, i) => (
                <span key={i} className={i > 0 ? styles.logoPipe : undefined}>
                  {i > 0 && (
                    <MenuText
                      text="|"
                      theme={headerLogoTheme}
                      colorOverride="var(--color-accent)"
                      noShadow
                    />
                  )}
                  {i > 0 && <MenuText text=" " theme={headerLogoTheme} />}
                  <LogoPartText part={part} theme={headerLogoTheme} />
                </span>
              ))}
            </span>
          </span>
        </Link>
      </div>

      {!authMinimalHeader && (
        <nav
          className="flex w-full min-w-0 items-center justify-center gap-3 min-[1000px]:gap-5 xl:gap-8"
          aria-label="Main"
        >
          {NAV_ITEMS.map((item, idx) => {
            const isActive = activeLink === item.activeKey;
            const isAnchor = item.href.startsWith("#");
            const resolvedHref =
              item.activeKey === "studio"
                ? headerCtx?.signedIn === true
                  ? "/account"
                  : LOGIN_RETURN_TO_ACCOUNT
                : item.href;
            const linkContent = (
              <span className="inline-flex items-start gap-1.5">
                <MenuText text={item.name} theme={effectiveTheme} />
                {item.badge && (
                  <span
                    className="font-nav align-top text-[11px] tracking-wider"
                    style={{
                      color:
                        effectiveTheme === "light"
                          ? "var(--color-light-text)"
                          : "var(--color-primary)",
                    }}
                  >
                    <span className={`text-accent ${styles.navOrangeNoShadow}`}>
                      [
                    </span>
                    {item.badge.slice(1, -1)}
                    <span className={`text-accent ${styles.navOrangeNoShadow}`}>
                      ]
                    </span>
                  </span>
                )}
              </span>
            );
            const linkClass = `${styles.menuItem} ${isActive ? styles.activeUnderline : ""}`;
            const wrapperClass = `${styles.menuItemWrapper} ${styles.menuItemAnimated}`;

            if (isAnchor) {
              return (
                <div
                  key={item.name}
                  className={wrapperClass}
                  style={{
                    ["--animation-delay" as string]: `${(idx + 1) * 0.15}s`,
                  }}
                >
                  <a href={item.href} className={linkClass}>
                    {linkContent}
                  </a>
                </div>
              );
            }

            return (
              <div
                key={item.name}
                className={wrapperClass}
                style={{
                  ["--animation-delay" as string]: `${(idx + 1) * 0.15}s`,
                }}
              >
                <Link href={resolvedHref} className={linkClass}>
                  {linkContent}
                </Link>
              </div>
            );
          })}
        </nav>
      )}

      {!authMinimalHeader &&
        (headerCtx?.signedIn ? (
          <div
            className={`${styles.menuItemWrapper} ${styles.menuItemAnimated} flex min-w-0 items-baseline justify-end gap-4 md:gap-6`}
            style={{ ["--animation-delay" as string]: "0.6s" }}
          >
            <Link
              href="/cart"
              className={`${styles.menuItem} relative inline-flex`}
              aria-label={`Cart (${headerCtx.cartCount} items)`}
            >
              <ShoppingBag
                className="h-5 w-5"
                strokeWidth={1.5}
                style={{ color: iconStrokeColor }}
              />
              {headerCtx.cartCount > 0 && (
                <span
                  className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded px-1 text-[9px] font-medium text-white"
                  style={{ background: "var(--color-accent)" }}
                  aria-hidden
                >
                  {headerCtx.cartCount > 99 ? "99+" : headerCtx.cartCount}
                </span>
              )}
            </Link>
            <Link
              href="/account/profile"
              className={`${styles.menuItem} inline-flex items-center justify-center`}
              aria-label={
                headerCtx.displayName
                  ? `Profile — ${headerCtx.displayName}`
                  : "Profile"
              }
              title={headerCtx.displayName ?? "Account"}
            >
              <UserCircle
                className="h-5 w-5"
                strokeWidth={1.5}
                aria-hidden
                style={{ color: iconStrokeColor }}
              />
            </Link>
          </div>
        ) : (
          <div
            className={`${styles.menuItemWrapper} ${styles.menuItemAnimated} relative flex min-w-0 flex-col items-end justify-end`}
            style={{ ["--animation-delay" as string]: "0.6s" }}
          >
            <button
              type="button"
              onClick={toggleJourneyMenu}
              className={`${styles.menuItem} cursor-pointer border-0 bg-transparent p-0 text-left`}
              aria-expanded={isNavExpanded}
              aria-label={`${CTA_NAV_LABEL}, open journey menu`}
            >
              <span className="inline-flex items-center gap-2">
                <span
                  className={`${styles.menuText} ${styles.navOrangeNoShadow}`}
                  style={{ color: "var(--color-accent)" }}
                >
                  [
                </span>
                <MenuText
                  text={CTA_NAV_LABEL}
                  theme={effectiveTheme}
                  lowercase
                />
                <span
                  className={`${styles.menuText} ${styles.navOrangeNoShadow}`}
                  style={{ color: "var(--color-accent)" }}
                >
                  ]
                </span>
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
                theme={effectiveTheme}
              />
            </div>
          </div>
        ))}
    </header>
  );
}
