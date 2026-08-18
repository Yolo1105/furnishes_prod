"use client";

import { useEffect, useState } from "react";
import { BracketedText } from "./BracketedText";
import { getCookieConsent, setCookieConsent } from "./cookie-consent";
import styles from "./landing.module.css";

/** Hero stage id — must match `LandingExperience` `.stage`. */
const LANDING_HERO_ID = "landing-hero";
/** Banner enter/exit transition length (ms) */
const BANNER_FADE_MS = 300;

/**
 * Cookie consent banner — Singapore PDPA-style baseline, adapted from the
 * archive `CookieConsent` for Landing.
 *
 * Appears on `/` after the visitor scrolls past the hero stage, and only if no
 * choice is stored yet.
 */
export function LandingCookieConsent() {
  const [needsConsent, setNeedsConsent] = useState<boolean | null>(null);
  const [pastLandingHero, setPastLandingHero] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [entered, setEntered] = useState(false);
  const [view, setView] = useState<"banner" | "custom">("banner");
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    setNeedsConsent(getCookieConsent() === null);
  }, []);

  useEffect(() => {
    if (needsConsent !== true) return;

    const el = document.getElementById(LANDING_HERO_ID);
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
  }, [needsConsent]);

  const eligible = needsConsent === true && pastLandingHero;

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
      setCookieConsent({
        essential: true,
        analytics: false,
        marketing: false,
      }),
    );

  const saveCustom = () =>
    dismissWithFade(() =>
      setCookieConsent({ essential: true, analytics, marketing }),
    );

  if (!eligible && !exiting) return null;

  const visuallyHidden = exiting || !entered;
  const rootClass = [
    styles.cookieBanner,
    visuallyHidden ? styles.cookieBannerHidden : styles.cookieBannerVisible,
  ].join(" ");

  return (
    <div
      role="dialog"
      aria-label="Cookie preferences"
      aria-modal="false"
      className={rootClass}
      style={{ transitionDuration: `${BANNER_FADE_MS}ms` }}
    >
      <div className={styles.cookieInner}>
        {view === "banner" ? (
          <div className={styles.cookieBannerRow}>
            <div className={styles.cookieCopy}>
              <CookieIcon />
              <div className={styles.cookieCopyText}>
                <p className={styles.cookieLabel}>
                  <BracketedText>COOKIES</BracketedText>
                </p>
                <p className={styles.cookieBody}>
                  We use essential cookies to keep the site working. Optional
                  ones help us understand how Furnishes is used and personalize
                  what we show you. Your choice, your call.
                </p>
              </div>
            </div>
            <div className={styles.cookieActions}>
              <button
                type="button"
                className={styles.cookieBtnGhost}
                onClick={() => setView("custom")}
              >
                Customize
              </button>
              <button
                type="button"
                className={styles.cookieBtnSecondary}
                onClick={essentialOnly}
              >
                Essential only
              </button>
              <button
                type="button"
                className={styles.cookieBtnPrimary}
                onClick={acceptAll}
              >
                Accept all
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className={styles.cookieCustomHead}>
              <p className={styles.cookieLabel}>
                <BracketedText>CHOOSE WHAT TO ALLOW</BracketedText>
              </p>
              <button
                type="button"
                className={styles.cookieClose}
                aria-label="Back"
                onClick={() => setView("banner")}
              >
                <CloseIcon />
              </button>
            </div>

            <div className={styles.cookieRows}>
              <ConsentRow
                label="Essential"
                description="Security and basic site function. Cannot be disabled. The site will not work without these."
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

            <div className={styles.cookieCustomFoot}>
              <button
                type="button"
                className={styles.cookieBtnPrimary}
                onClick={saveCustom}
              >
                Save preferences
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
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
      className={`${styles.cookieRow}${disabled ? "" : ` ${styles.cookieRowInteractive}`}`}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className={styles.cookieCheck}
      />
      <div>
        <span
          className={
            disabled ? styles.cookieRowLabelMuted : styles.cookieRowLabel
          }
        >
          {label}
          {disabled ? (
            <span className={styles.cookieAlwaysOn}> (always on)</span>
          ) : null}
        </span>
        <p className={styles.cookieRowDesc}>{description}</p>
      </div>
    </label>
  );
}

function CookieIcon() {
  return (
    <svg
      className={styles.cookieIcon}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5" />
      <circle cx="8.5" cy="8.5" r="0.6" fill="currentColor" stroke="none" />
      <circle cx="14.5" cy="12.5" r="0.6" fill="currentColor" stroke="none" />
      <circle cx="10" cy="15.5" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}
