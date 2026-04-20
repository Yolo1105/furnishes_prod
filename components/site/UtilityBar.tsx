"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/eva-dashboard/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/eva-dashboard/ui/popover";
import {
  UTILITY_DELIVERY_BODY,
  UTILITY_DELIVERY_HREF,
  UTILITY_DELIVERY_LABEL,
  UTILITY_DELIVERY_LINK_LABEL,
  UTILITY_DELIVERY_TITLE,
  UTILITY_LOCALE_OPTIONS,
  UTILITY_LOCALE_STORAGE_KEY,
  UTILITY_LOCATION_BODY,
  UTILITY_LOCATION_HREF,
  UTILITY_LOCATION_LABEL,
  UTILITY_LOCATION_LINK_LABEL,
  UTILITY_LOCATION_TITLE,
  getLocaleLabel,
  getUtilityBarCenterMessage,
  type UtilityLocaleId,
} from "@/content/site/utility-bar";
import { cn } from "@/lib/utils";

const utilityTriggerClass =
  "group inline-flex max-w-full items-center gap-1 rounded-sm px-1 py-0.5 text-left text-background/95 transition-[transform,background-color,opacity] duration-200 ease-out outline-none hover:bg-black/15 active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-white/60 motion-reduce:transition-none motion-reduce:active:scale-100";

const panelMotionClass =
  "motion-reduce:data-[state=open]:animate-none motion-reduce:data-[state=closed]:animate-none";

/** Portals render outside the bar — bind Inter explicitly + cream surface (matches page, not stark popover white). */
const utilityPortalFontStyle = {
  fontFamily: "var(--font-inter), ui-sans-serif, system-ui, sans-serif",
} as const;

const utilityPortalPanelClass =
  "border border-[var(--auth-field-border)] bg-background text-foreground shadow-md";

function GlobeIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function TruckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <path
        d="M14 18V6H4v12h2m8 0h2m-8 0a2 2 0 104 0m4 0a2 2 0 104 0M6 18V9h4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PinIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <path
        d="M12 21s7-4.35 7-11a7 7 0 10-14 0c0 6.65 7 11 7 11z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="10" r="2" fill="currentColor" />
    </svg>
  );
}

/**
 * Top utility strip above the main navbar — theme accent (`--color-accent`), same gutters as `Header`.
 * Center line is route-specific via `getUtilityBarCenterMessage`.
 */
export function UtilityBar() {
  const pathname = usePathname() ?? "/";
  const centerMessage = getUtilityBarCenterMessage(pathname);

  const [localeId, setLocaleId] = useState<UtilityLocaleId>("en-SG");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(UTILITY_LOCALE_STORAGE_KEY);
      if (raw === "en-SG" || raw === "zh-SG") {
        queueMicrotask(() => setLocaleId(raw));
      }
    } catch {
      /* ignore */
    }
  }, []);

  const localeLabel = getLocaleLabel(localeId);

  const onLocaleChange = (value: string) => {
    const id = value as UtilityLocaleId;
    const option = UTILITY_LOCALE_OPTIONS.find((o) => o.id === id);
    if (option?.disabled) return;
    setLocaleId(id);
    try {
      localStorage.setItem(UTILITY_LOCALE_STORAGE_KEY, id);
    } catch {
      /* ignore */
    }
  };

  return (
    <div
      className="bg-accent text-background relative z-auto w-full shrink-0 overflow-hidden font-sans text-[11px] leading-snug font-normal tracking-wide md:text-xs"
      style={{ height: "var(--utility-bar-height)" }}
    >
      <div
        className="mx-auto flex h-full w-full max-w-[100%] items-center justify-between gap-2 px-[var(--site-inline-gutter)] md:gap-4"
        role="region"
        aria-label="Site tools and announcements"
      >
        <div className="flex min-w-0 shrink-0 items-center">
          {/* modal={false}: no body scroll lock — avoids scrollbar flash / layout shift (Radix modal uses RemoveScroll). */}
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger
              className={utilityTriggerClass}
              aria-label="Language and region"
            >
              <GlobeIcon className="text-background/85 shrink-0 transition-transform duration-200 ease-out group-data-[state=open]:rotate-12 motion-reduce:transition-none motion-reduce:group-data-[state=open]:rotate-0" />
              <span className="max-w-[120px] truncate whitespace-nowrap sm:max-w-none">
                {localeLabel}
              </span>
              <ChevronDown
                className="text-background/80 size-3 shrink-0 opacity-90 transition-transform duration-200 ease-out group-data-[state=open]:rotate-180 motion-reduce:transition-none"
                aria-hidden
              />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              sideOffset={6}
              style={utilityPortalFontStyle}
              className={cn(
                "z-[200] min-w-[12rem] p-1.5",
                utilityPortalPanelClass,
                panelMotionClass,
              )}
            >
              <DropdownMenuLabel className="text-muted-foreground px-2 py-1.5 text-[10px] font-[375] tracking-[0.14em] uppercase">
                Region & language
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-[color:rgba(43,31,24,0.1)]" />
              <DropdownMenuRadioGroup
                value={localeId}
                onValueChange={onLocaleChange}
              >
                {UTILITY_LOCALE_OPTIONS.map((opt) => (
                  <DropdownMenuRadioItem
                    key={opt.id}
                    value={opt.id}
                    disabled={opt.disabled}
                    className="text-xs font-[375] tracking-wide data-[state=checked]:font-medium"
                  >
                    {opt.label}
                    {opt.disabled ? (
                      <span className="text-muted-foreground ml-1">(soon)</span>
                    ) : null}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <p className="text-background/95 min-w-0 flex-1 px-1 text-center text-[10px] hyphens-none sm:text-[11px] md:px-3 md:text-xs">
          <span className="line-clamp-2 sm:line-clamp-1">{centerMessage}</span>
        </p>

        <div className="flex min-w-0 shrink-0 items-center justify-end gap-1.5 md:gap-3">
          <Popover>
            <PopoverTrigger
              className={cn(
                utilityTriggerClass,
                "hidden max-w-[min(100vw-8rem,11rem)] sm:inline-flex",
              )}
              aria-label="Delivery details"
            >
              <TruckIcon className="text-background/85 shrink-0 transition-transform duration-200 ease-out group-data-[state=open]:-translate-y-px motion-reduce:transition-none motion-reduce:group-data-[state=open]:translate-y-0" />
              <span className="max-w-[100px] truncate whitespace-nowrap md:max-w-[140px]">
                {UTILITY_DELIVERY_LABEL}
              </span>
              <ChevronDown
                className="text-background/80 size-3 shrink-0 opacity-90 transition-transform duration-200 ease-out group-data-[state=open]:rotate-180 motion-reduce:transition-none"
                aria-hidden
              />
            </PopoverTrigger>
            <PopoverContent
              align="end"
              sideOffset={8}
              style={utilityPortalFontStyle}
              className={cn(
                "z-[200] w-[min(18rem,calc(100vw-2rem))] p-3",
                utilityPortalPanelClass,
                panelMotionClass,
              )}
            >
              <p className="text-foreground text-sm font-[375]">
                {UTILITY_DELIVERY_TITLE}
              </p>
              <p className="text-muted-foreground mt-1.5 text-xs leading-relaxed font-[375]">
                {UTILITY_DELIVERY_BODY}
              </p>
              <Link
                href={UTILITY_DELIVERY_HREF}
                className="text-foreground mt-3 inline-flex text-xs font-[375] underline-offset-4 transition-colors hover:underline"
              >
                {UTILITY_DELIVERY_LINK_LABEL}
              </Link>
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger
              className={utilityTriggerClass}
              aria-label="Location details"
            >
              <PinIcon className="text-background/85 shrink-0 transition-transform duration-200 ease-out group-data-[state=open]:scale-110 motion-reduce:transition-none motion-reduce:group-data-[state=open]:scale-100" />
              <span className="whitespace-nowrap">
                {UTILITY_LOCATION_LABEL}
              </span>
              <ChevronDown
                className="text-background/80 size-3 shrink-0 opacity-90 transition-transform duration-200 ease-out group-data-[state=open]:rotate-180 motion-reduce:transition-none"
                aria-hidden
              />
            </PopoverTrigger>
            <PopoverContent
              align="end"
              sideOffset={8}
              style={utilityPortalFontStyle}
              className={cn(
                "z-[200] w-[min(18rem,calc(100vw-2rem))] p-3",
                utilityPortalPanelClass,
                panelMotionClass,
              )}
            >
              <p className="text-foreground text-sm font-[375]">
                {UTILITY_LOCATION_TITLE}
              </p>
              <p className="text-muted-foreground mt-1.5 text-xs leading-relaxed font-[375]">
                {UTILITY_LOCATION_BODY}
              </p>
              <Link
                href={UTILITY_LOCATION_HREF}
                className="text-foreground mt-3 inline-flex text-xs font-[375] underline-offset-4 transition-colors hover:underline"
              >
                {UTILITY_LOCATION_LINK_LABEL}
              </Link>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  );
}
