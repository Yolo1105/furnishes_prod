// @ts-nocheck

"use client";

import { QUIZ_PAD_X, Icon, hexA, pressFx } from "./shared";
import { answerStatus } from "@/features/quiz/engine/sequence";
import { LayoutBudgetResult } from "./layouts";
import { FadeIn } from "./results-helpers";

export function QuizHomeLink({ color = "#fff" }: any) {
  return (
    <a
      href="/"
      aria-label="Back to Furnishes home"
      style={{
        display: "inline-flex",
        alignItems: "center",
        fontFamily:
          "var(--font-space-mono, 'Space Mono'), 'Space Mono', ui-monospace, monospace",
        fontSize: "15px",
        letterSpacing: "0.04em",
        color,
        fontWeight: 700,
        textDecoration: "none",
        textTransform: "lowercase",
        flexShrink: 0,
        lineHeight: 1,
      }}
    >
      furnishes<span style={{ color: "#B33D0E" }}>.</span>
    </a>
  );
}

export function QuizShell({
  question,
  answer,
  contentKey,
  contentFade,
  flowMeta,
  canProceed,
  onNext,
  onBack,
  children,
  showBudgetResult,
  budgetRange,
  budgetAccent,
  budgetBg,
}: any) {
  return (
    <div
      className="q-vh"
      style={{
        backgroundColor:
          "transparent" /* bg lives on the persistent page layer */,
        position: "relative",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <header style={{ padding: `24px ${QUIZ_PAD_X} 0`, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "18px" }}>
          {/* boxed square — the bare floating glyph read as a stray character */}
          <button
            onClick={onBack}
            aria-label="Previous question"
            {...pressFx()}
            style={{
              width: "34px",
              height: "34px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "none",
              border: `1.5px solid ${hexA(question.accent, 0.35)}`,
              color: question.accent,
              opacity: 0.65,
              cursor: "pointer",
              padding: 0,
              transition:
                "opacity 0.2s, border-color 0.25s ease, background-color 0.25s ease, color 0.45s ease",
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = "1";
              e.currentTarget.style.borderColor = question.accent;
              e.currentTarget.style.backgroundColor = hexA(
                question.accent,
                0.08,
              );
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = "0.65";
              e.currentTarget.style.borderColor = hexA(question.accent, 0.35);
              e.currentTarget.style.backgroundColor = "transparent";
            }}
          >
            <Icon name="arrow-left" size={14} />
          </button>

          {/* ── Flow stepper: each label sits directly above its own segment ── */}
          <div style={{ display: "flex", gap: "10px", flex: 1 }}>
            {flowMeta.map((f, i) => {
              const state = f.done ? "done" : f.active ? "active" : "pending";
              return (
                <div
                  key={f.key}
                  className="q-step"
                  data-state={state}
                  style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                    minWidth: 0,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "baseline",
                      gap: "8px",
                      whiteSpace: "nowrap",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "9px",
                        fontWeight: 700,
                        letterSpacing: "0.1em",
                        color: question.accent,
                        opacity: state === "pending" ? 0.3 : 0.55,
                        transition: "opacity 0.3s, color 0.45s ease",
                      }}
                    >
                      {state === "done" ? (
                        <Icon name="check" size={9} strokeWidth={2.5} />
                      ) : (
                        String(i + 1).padStart(2, "0")
                      )}
                    </span>
                    <span
                      className="q-step-name"
                      style={{
                        fontSize: "10px",
                        fontWeight: 700,
                        letterSpacing: "0.22em",
                        color: question.accent,
                        opacity:
                          state === "active"
                            ? 1
                            : state === "done"
                              ? 0.55
                              : 0.3,
                        transition: "opacity 0.3s, color 0.45s ease",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {f.label}
                    </span>
                    {state === "active" && (
                      <span
                        className="q-step-count"
                        style={{
                          fontSize: "9px",
                          fontWeight: 700,
                          letterSpacing: "0.1em",
                          color: question.accent,
                          opacity: 0.55,
                        }}
                      >
                        {f.current}/{f.total}
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      height: "2px",
                      backgroundColor: hexA(question.accent, 0.18),
                      position: "relative",
                      overflow: "hidden",
                      transition: "background-color 0.45s ease",
                    }}
                  >
                    <div
                      style={{
                        position: "absolute",
                        left: 0,
                        top: 0,
                        bottom: 0,
                        width: f.done
                          ? "100%"
                          : f.active
                            ? `${Math.round((f.current / f.total) * 100)}%`
                            : "0%",
                        backgroundColor: question.accent,
                        transition:
                          "width 0.35s cubic-bezier(0.22, 1, 0.36, 1), background-color 0.45s ease",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </header>

      <main
        style={{
          display: "flex",
          flex: 1,
          flexDirection: "column",
          minHeight: 0,
          overflow: "auto",
          overscrollBehavior: "contain",
        }}
      >
        <div
          key={contentKey}
          style={{
            display: "flex",
            flex: 1,
            flexDirection: "column",
            minHeight: 0,
            opacity:
              contentFade && (contentFade.exiting || !contentFade.entered)
                ? 0
                : 1,
            /* pure fade — no movement */
            transition:
              contentFade && contentFade.exiting
                ? "opacity 0.22s ease-in"
                : "opacity 0.5s cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        >
          {children}
        </div>
      </main>

      {showBudgetResult && budgetRange && (
        <FadeIn style={{ padding: `0 ${QUIZ_PAD_X} 20px` }}>
          <LayoutBudgetResult
            range={budgetRange}
            accent={budgetAccent ?? "#DDD5C4"}
            bg={budgetBg ?? "#1a1714"}
          />
        </FadeIn>
      )}

      <footer
        style={{
          padding: `14px ${QUIZ_PAD_X} 24px`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "16px",
          flexWrap: "wrap",
          flexShrink: 0,
        }}
      >
        {/* ── Live status: instant feedback on every selection ── */}
        {(() => {
          const st = answerStatus(question, answer, canProceed);
          return (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "9px",
                minHeight: "20px",
              }}
            >
              {/* the lone hollow square read as a broken checkbox — done state
                  now speaks with the brand check, incomplete stays text-only */}
              {st.done && (
                <span
                  style={{ color: question.accent, display: "inline-flex" }}
                >
                  <Icon name="check" size={11} strokeWidth={2.5} />
                </span>
              )}
              <span
                aria-live="polite"
                style={{
                  fontSize: "11px",
                  letterSpacing: "0.18em",
                  color: question.accent,
                  opacity: st.quiet ? 0.35 : st.done ? 0.9 : 0.5,
                  fontWeight: 700,
                  transition: "opacity 0.3s ease",
                }}
              >
                {st.text}
              </span>
            </div>
          );
        })()}

        {/* ── NEXT: transforms from ghost text into a filled button when ready ── */}
        <button
          onClick={canProceed ? onNext : undefined}
          disabled={!canProceed}
          aria-label="Next question"
          style={{
            color: canProceed ? question.bg : question.accent,
            backgroundColor: canProceed ? question.accent : "transparent",
            opacity: canProceed ? 1 : 0.2,
            fontSize: "13px",
            letterSpacing: "0.22em",
            fontWeight: 700,
            border: `1.5px solid ${canProceed ? question.accent : "transparent"}`,
            cursor: canProceed ? "pointer" : "default",
            padding: canProceed ? "12px 26px" : "12px 0",
            transition:
              "background-color 0.3s ease, color 0.3s ease, padding 0.35s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.3s ease, border-color 0.3s ease",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            flexShrink: 0,
          }}
          onMouseEnter={(e) => {
            if (canProceed) {
              const arrow = e.currentTarget.querySelector("[data-arrow]");
              if (arrow) arrow.style.transform = "translateX(5px)";
            }
          }}
          onMouseLeave={(e) => {
            const arrow = e.currentTarget.querySelector("[data-arrow]");
            if (arrow) arrow.style.transform = "translateX(0)";
          }}
        >
          NEXT
          <span
            data-arrow
            style={{
              display: "inline-flex",
              transition: "transform 0.2s cubic-bezier(0.22, 1, 0.36, 1)",
            }}
          >
            <Icon name="arrow-right" size={14} />
          </span>
        </button>
      </footer>
    </div>
  );
}
