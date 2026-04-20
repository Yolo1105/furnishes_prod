"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Cookie, X } from "lucide-react";

/**
 * Cookie consent banner — Singapore PDPA compliant baseline.
 *
 * 3 states:
 *   - "all"        — accept everything (analytics, marketing, etc.)
 *   - "essential"  — only essential cookies (auth, cart, CSRF)
 *   - "custom"     — granular toggle UI
 *
 * Choice persists in `furnishes-cookie-consent` cookie (1 year).
 * The bar only appears on the landing route (`/`), after the visitor scrolls
 * past `#Home` (hero / landing carousel), and only if no choice is stored yet.
 *
 * Drop into root layout AFTER children:
 *   <CookieConsent />
 *
 * Other code can read the choice with `getCookieConsent()`:
 *   if (consent.analytics) { /* fire analytics * / }
 */

/** Landing page pathname (App Router). */
const LANDING_PATH = "/";
/** Hero section id — must match `HomePage` (`#Home`). */
const LANDING_SECTION_ID = "Home";

const COOKIE_NAME = "furnishes-cookie-consent";
const COOKIE_MAX_AGE_DAYS = 365;
/** Banner enter/exit transition length (ms) */
const BANNER_FADE_MS = 300;

/** Slightly lifted cream for “Essential only” — not stark white vs page bg */
const BTN_SECONDARY_FILL =
  "color-mix(in srgb, var(--background) 91%, #ffffff 9%)";

type ConsentChoice = {
  essential: true; // always true
  analytics: boolean;
  marketing: boolean;
  /** ISO timestamp when choice was recorded — for re-prompting on policy changes */
  recordedAt: string;
};

export function getCookieConsent(): ConsentChoice | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
  if (!match) return null;
  try {
    return JSON.parse(decodeURIComponent(match[1]!)) as ConsentChoice;
  } catch {
    return null;
  }
}

function setCookieConsent(choice: Omit<ConsentChoice, "recordedAt">) {
  const value: ConsentChoice = {
    ...choice,
    recordedAt: new Date().toISOString(),
  };
  const maxAge = COOKIE_MAX_AGE_DAYS * 24 * 60 * 60;
  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(JSON.stringify(value))};path=/;max-age=${maxAge};SameSite=Lax`;
}

export function CookieConsent() {
  const pathname = usePathname() ?? "";
  /** null while checking cookie; false once choice exists */
  const [needsConsent, setNeedsConsent] = useState<boolean | null>(null);
  /** User has scrolled past `#Home` (not overlapping the landing hero). */
  const [pastLandingHero, setPastLandingHero] = useState(false);
  /** True while opacity/slide-out runs before unmount */
  const [exiting, setExiting] = useState(false);
  /**
   * After mount, flip true on the next frames so the browser can transition
   * from opacity 0 → 1 (otherwise there is no "from" state to animate).
   */
  const [entered, setEntered] = useState(false);
  const [view, setView] = useState<"banner" | "custom">("banner");
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  const onLanding = pathname === LANDING_PATH;

  useEffect(() => {
    setNeedsConsent(getCookieConsent() === null);
  }, []);

  useEffect(() => {
    if (!onLanding) setPastLandingHero(false);
  }, [onLanding]);

  useEffect(() => {
    if (needsConsent !== true || !onLanding) return;

    const el = document.getElementById(LANDING_SECTION_ID);
    if (!el) return;

    const updatePastHero = () => {
      const { bottom } = el.getBoundingClientRect();
      if (bottom <= 0) setPastLandingHero(true);
    };

    updatePastHero();
    window.addEventListener("scroll", updatePastHero, { passive: true });
    window.addEventListener("resize", updatePastHero);
    return () => {
      window.removeEventListener("scroll", updatePastHero);
      window.removeEventListener("resize", updatePastHero);
    };
  }, [needsConsent, onLanding]);

  const eligible = needsConsent === true && onLanding && pastLandingHero;

  /** Run after layout so CSS transitions see a committed "before" frame. */
  useEffect(() => {
    if (!eligible || exiting) return;
    setEntered(false);
    let raf1 = 0;
    let raf2 = 0;
    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        setEntered(true);
      });
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [eligible, exiting]);

  const dismissWithFade = (applyChoice: () => void) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setExiting(true);
        window.setTimeout(() => {
          applyChoice();
          setNeedsConsent(false);
          setExiting(false);
          setEntered(false);
          setView("banner");
        }, BANNER_FADE_MS);
      });
    });
  };

  const acceptAll = () =>
    dismissWithFade(() =>
      setCookieConsent({ essential: true, analytics: true, marketing: true }),
    );

  const essentialOnly = () =>
    dismissWithFade(() =>
      setCookieConsent({ essential: true, analytics: false, marketing: false }),
    );

  const saveCustom = () =>
    dismissWithFade(() =>
      setCookieConsent({ essential: true, analytics, marketing }),
    );

  if (!eligible && !exiting) return null;

  const visuallyHidden = exiting || !entered;

  return (
    <div
      role="dialog"
      aria-label="Cookie preferences"
      aria-modal="false"
      className={`fixed inset-x-0 bottom-0 isolate z-50 border-t border-[var(--auth-field-border)] shadow-[0_-6px_28px_rgba(43,31,24,0.07)] ease-out ${
        visuallyHidden
          ? "pointer-events-none translate-y-3 opacity-0"
          : "translate-y-0 opacity-100"
      }`}
      style={{
        backgroundColor: "var(--background)",
        transitionProperty: "opacity, transform",
        transitionDuration: `${BANNER_FADE_MS}ms`,
        transitionTimingFunction: "ease-out",
      }}
    >
      <div className="mx-auto w-full max-w-[1320px] px-6 py-5 sm:px-8 lg:px-10">
        {view === "banner" && <BannerView />}
        {view === "custom" && <CustomView />}
      </div>
    </div>
  );

  function BannerView() {
    return (
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-3">
          <Cookie
            className="text-foreground/80 mt-0.5 h-4 w-4 shrink-0"
            aria-hidden
          />
          <div className="min-w-0">
            <p className="text-foreground font-sans text-[10.5px] tracking-[0.18em] uppercase">
              [ COOKIES ]
            </p>
            <p className="text-foreground mt-1 font-sans text-sm leading-relaxed font-[375]">
              We use essential cookies to keep you signed in and your cart
              intact. Optional ones help us understand how Furnishes is used and
              personalize what we show you. Your choice, your call.{" "}
              <a
                href="/privacy-policy"
                className="cursor-pointer text-[var(--color-accent)] underline underline-offset-2 transition-opacity hover:opacity-90"
              >
                Read our policy
              </a>
              .
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 md:shrink-0">
          <button
            type="button"
            onClick={() => setView("custom")}
            className="text-foreground hover:border-foreground/28 cursor-pointer border border-[var(--auth-field-border)] bg-transparent px-4 py-2 font-sans text-[10.5px] tracking-[0.18em] uppercase transition-colors hover:bg-[color-mix(in_srgb,var(--background)_82%,#171717_5%)]"
          >
            Customize
          </button>
          <button
            type="button"
            onClick={essentialOnly}
            className="text-foreground cursor-pointer border border-[var(--auth-field-border)] px-4 py-2 font-sans text-[10.5px] tracking-[0.18em] uppercase transition-opacity hover:opacity-[0.97]"
            style={{ backgroundColor: BTN_SECONDARY_FILL }}
          >
            Essential only
          </button>
          <button
            type="button"
            onClick={acceptAll}
            className="cursor-pointer border border-[var(--color-accent)] bg-[var(--color-accent)] px-4 py-2 font-sans text-[10.5px] tracking-[0.18em] text-[var(--color-on-accent-fg)] uppercase transition-opacity hover:opacity-95"
          >
            Accept all
          </button>
        </div>
      </div>
    );
  }

  function CustomView() {
    return (
      <div>
        <div className="mb-4 flex items-center justify-between">
          <p className="text-foreground font-sans text-[10.5px] tracking-[0.18em] uppercase">
            [ CHOOSE WHAT TO ALLOW ]
          </p>
          <button
            type="button"
            onClick={() => setView("banner")}
            aria-label="Back"
            className="text-foreground/70 hover:text-foreground cursor-pointer transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="border-foreground/12 space-y-3 border-t border-b py-4">
          <ConsentRow
            label="Essential"
            description="Sign-in, cart, security. Cannot be disabled — the site won't work without these."
            checked
            disabled
            onChange={() => undefined}
          />
          <ConsentRow
            label="Analytics"
            description="Anonymized usage data so we can fix what's confusing and improve what works."
            checked={analytics}
            onChange={setAnalytics}
          />
          <ConsentRow
            label="Marketing"
            description="Helps us show you furniture and ideas you'll actually like, here and on partner sites."
            checked={marketing}
            onChange={setMarketing}
          />
        </div>

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={saveCustom}
            className="cursor-pointer border border-[var(--color-accent)] bg-[var(--color-accent)] px-4 py-2 font-sans text-[10.5px] tracking-[0.18em] text-[var(--color-on-accent-fg)] uppercase transition-opacity hover:opacity-95"
          >
            Save preferences
          </button>
        </div>
      </div>
    );
  }
}

function ConsentRow({
  label,
  description,
  checked,
  disabled = false,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <label
      className={`flex items-start gap-3 ${disabled ? "" : "cursor-pointer"}`}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className={`mt-0.5 accent-[var(--color-accent)] ${disabled ? "cursor-not-allowed" : "cursor-pointer"}`}
      />
      <div>
        <span
          className={`font-sans text-[12px] tracking-[0.06em] uppercase ${disabled ? "text-foreground/60" : "text-foreground"}`}
        >
          {label}
          {disabled && (
            <span className="text-muted-foreground ml-2 text-[10px] tracking-normal normal-case">
              (always on)
            </span>
          )}
        </span>
        <p className="text-muted-foreground mt-0.5 font-sans text-xs leading-relaxed font-[375]">
          {description}
        </p>
      </div>
    </label>
  );
}
