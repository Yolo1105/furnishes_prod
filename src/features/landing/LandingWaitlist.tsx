"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { BracketedText, stripBrackets } from "./BracketedText";
import { landingContent } from "./landing-content";
import styles from "./landing.module.css";
import { submitWaitlist } from "./waitlist-adapter";

export function LandingWaitlist() {
  const [emailAddress, setEmailAddress] = useState("");
  const [status, setStatus] = useState<
    | "idle"
    | "invalid"
    | "pending"
    | "success"
    | "duplicate"
    | "unavailable"
    | "error"
  >("idle");
  const { waitlist } = landingContent;
  const done = status === "success" || status === "duplicate";
  const showErr =
    status === "invalid" || status === "error" || status === "unavailable";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "pending") return;

    setStatus("pending");
    try {
      const result = await submitWaitlist(emailAddress);
      if (!result.ok && result.reason === "duplicate") {
        setStatus("duplicate");
      } else if (!result.ok && result.reason === "invalid") {
        setStatus("invalid");
      } else if (!result.ok && result.reason === "unavailable") {
        setStatus("unavailable");
      } else if (!result.ok) {
        setStatus("error");
      } else {
        setStatus("success");
      }
    } catch {
      setStatus("error");
    }
  }

  return (
    <section
      className={styles.waitlist}
      id="waitlist"
      aria-labelledby="landing-waitlist-title"
    >
      <div className={styles.waitlistIn}>
        <div>
          <p className={`${styles.sectionEyebrow} ${styles.reveal}`}>
            <BracketedText>{stripBrackets(waitlist.tag)}</BracketedText>
          </p>
          <h2
            id="landing-waitlist-title"
            className={`${styles.sectionTitle} ${styles.waitlistTitle} ${styles.reveal}`}
          >
            {waitlist.titleLead}{" "}
            <span className={styles.accentItalic}>{waitlist.titleAccent}</span>{" "}
            {waitlist.titleTrail}
          </h2>
          <p className={`${styles.sectionBody} ${styles.reveal}`}>
            {waitlist.lead}
          </p>
        </div>

        <div className={`${styles.waitlistRight} ${styles.reveal}`}>
          {done ? (
            <p className={styles.waitlistDone} role="status">
              {status === "duplicate" ? (
                <>
                  You&rsquo;re already on the list,{" "}
                  <span className={styles.accentItalic}>
                    see you at launch.
                  </span>
                </>
              ) : (
                <>
                  You&rsquo;re on the list,{" "}
                  <span className={styles.accentItalic}>
                    see you at launch.
                  </span>
                </>
              )}
            </p>
          ) : (
            <form
              className={styles.waitlistForm}
              onSubmit={handleSubmit}
              noValidate
            >
              <label
                className={styles.waitlistLabel}
                htmlFor="landing-waitlist-email"
              >
                Email address
              </label>
              <div className={styles.waitlistRow}>
                <input
                  id="landing-waitlist-email"
                  className={styles.waitlistInput}
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  value={emailAddress}
                  disabled={status === "pending"}
                  aria-invalid={showErr}
                  aria-describedby="landing-waitlist-note"
                  onChange={(event) => {
                    setEmailAddress(event.target.value);
                    if (showErr) setStatus("idle");
                  }}
                  placeholder={waitlist.placeholder}
                />
                <button
                  className={styles.waitlistButton}
                  type="submit"
                  disabled={status === "pending"}
                  aria-label={
                    status === "pending"
                      ? "Joining the waitlist"
                      : "Join the waitlist"
                  }
                >
                  {status === "pending" ? (
                    <span className={styles.waitlistPending} aria-hidden="true">
                      …
                    </span>
                  ) : (
                    <svg
                      className={styles.waitlistArrow}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.1"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M5 12h14" />
                      <path d="M13 6l6 6-6 6" />
                    </svg>
                  )}
                </button>
              </div>
              {status === "invalid" ? (
                <p
                  id="landing-waitlist-note"
                  className={styles.waitlistStatusError}
                  role="alert"
                >
                  Please enter a valid email address.
                </p>
              ) : status === "unavailable" ? (
                <p
                  id="landing-waitlist-note"
                  className={styles.waitlistStatusError}
                  role="alert"
                >
                  Waitlist is temporarily unavailable. Please try again later.
                </p>
              ) : status === "error" ? (
                <p
                  id="landing-waitlist-note"
                  className={styles.waitlistStatusError}
                  role="alert"
                >
                  Something went wrong. Please try again.
                </p>
              ) : status === "pending" ? (
                <p
                  id="landing-waitlist-note"
                  className={styles.waitlistStatus}
                  role="status"
                >
                  Adding you…
                </p>
              ) : (
                <p id="landing-waitlist-note" className={styles.waitlistStatus}>
                  {waitlist.idleNote}
                </p>
              )}
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
