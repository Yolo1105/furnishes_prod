// @ts-nocheck

"use client";

import { useEffect, useRef, useState } from "react";
import { STYLE_QUESTIONS } from "@/features/quiz/data/style-questions";
import { BUDGET_QUESTIONS } from "@/features/quiz/data/budget-questions";
import { ROOM_QUESTIONS } from "@/features/quiz/data/room-questions";
import { STYLE_PROFILES } from "@/features/quiz/data/style-profiles";
import { QUIZ_PAD_X } from "./shared";

export function fmtUSD(n: any) {
  return "$" + n.toLocaleString("en-US");
}

export function ResultsShell({ children, ghostWord }: any) {
  return (
    <div
      className="quiz-enter q-vh"
      style={{
        backgroundColor: "transparent",
        color: "#DDD5C4",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        overflow: "auto",
        overscrollBehavior: "contain",
      }}
    >
      <div
        aria-hidden="true"
        className="q-display"
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          fontSize: "clamp(40px, 10vw, 120px)",
          fontWeight: 700,
          color: "transparent",
          WebkitTextStroke: "1px #B33D0E",
          opacity: 0.05,
          whiteSpace: "nowrap",
          userSelect: "none",
          pointerEvents: "none",
          letterSpacing: "-0.03em",
          lineHeight: 1,
        }}
      >
        {ghostWord}
      </div>
      {children}
    </div>
  );
}

export function ResultsHeader({
  label,
  onRetake,
  onEdit,
  ready,
  onCopy,
  copyState,
}: any) {
  const [confirming, setConfirming] = useState(false);
  const confirmTimer = useRef(null);
  useEffect(() => () => clearTimeout(confirmTimer.current), []);
  const handleRetakeClick = (e) => {
    e.stopPropagation();
    if (!confirming) {
      setConfirming(true);
      confirmTimer.current = setTimeout(() => setConfirming(false), 2600);
      return;
    }
    clearTimeout(confirmTimer.current);
    onRetake();
  };
  const actionStyle = (accent) => ({
    fontSize: "12px",
    letterSpacing: "0.16em",
    color: accent ? "#B33D0E" : "rgba(221,213,196,0.5)",
    background: "none",
    border: "none",
    cursor: "pointer",
    fontWeight: 700,
    transition: "color 0.2s, opacity 0.3s",
    padding: 0,
  });
  return (
    <header
      style={{
        padding: `22px ${QUIZ_PAD_X}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "18px",
        flexWrap: "wrap",
        position: "relative",
        zIndex: 1,
        borderBottom: "1px solid rgba(221,213,196,0.12)",
      }}
    >
      <span
        style={{
          fontSize: "12px",
          letterSpacing: "0.2em",
          color: "#B33D0E",
          fontWeight: 700,
        }}
      >
        {label}
      </span>
      <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
        {onCopy && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCopy();
            }}
            style={{
              ...actionStyle(copyState === "copied"),
              opacity: ready ? 1 : 0,
              pointerEvents: ready ? "auto" : "none",
            }}
            onMouseEnter={(e) =>
              copyState === "idle" &&
              (e.currentTarget.style.color = "rgba(221,213,196,0.8)")
            }
            onMouseLeave={(e) =>
              copyState === "idle" &&
              (e.currentTarget.style.color = "rgba(221,213,196,0.35)")
            }
          >
            {copyState === "copied" ? (
              <>
                COPIED <Icon name="check" size={11} />
              </>
            ) : copyState === "failed" ? (
              "COPY UNAVAILABLE"
            ) : (
              <>
                COPY BRIEF <Icon name="copy" size={11} />
              </>
            )}
          </button>
        )}
        {onEdit && (
          <span
            aria-hidden="true"
            style={{
              width: "1px",
              height: "12px",
              backgroundColor: "rgba(221,213,196,0.2)",
              opacity: ready ? 1 : 0,
              transition: "opacity 0.3s",
            }}
          />
        )}
        {onEdit && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            style={actionStyle(false)}
            onMouseEnter={(e) =>
              (e.currentTarget.style.color = "rgba(221,213,196,0.8)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.color = "rgba(221,213,196,0.35)")
            }
          >
            <Icon name="arrow-left" size={11} /> EDIT ANSWERS
          </button>
        )}
        <span
          aria-hidden="true"
          style={{
            width: "1px",
            height: "12px",
            backgroundColor: "rgba(221,213,196,0.2)",
          }}
        />
        <button
          onClick={handleRetakeClick}
          style={actionStyle(confirming)}
          onMouseEnter={(e) =>
            !confirming &&
            (e.currentTarget.style.color = "rgba(221,213,196,0.8)")
          }
          onMouseLeave={(e) =>
            !confirming &&
            (e.currentTarget.style.color = "rgba(221,213,196,0.35)")
          }
        >
          {confirming ? (
            <>
              SURE? THIS CLEARS ALL <Icon name="arrow-right" size={11} />
            </>
          ) : (
            <>
              RETAKE <Icon name="arrow-right" size={11} />
            </>
          )}
        </button>
      </div>
    </header>
  );
}

export function KVRows({ title, rows }: any) {
  return (
    <div>
      <span
        style={{
          fontSize: "11px",
          letterSpacing: "0.2em",
          color: "rgba(221,213,196,0.3)",
          fontWeight: 700,
          display: "block",
          marginBottom: "12px",
        }}
      >
        {title}
      </span>
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {rows.map((row) => (
          <div
            key={row.category}
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: "16px",
              borderBottom: "1px solid rgba(221,213,196,0.08)",
              paddingBottom: "8px",
            }}
          >
            <span
              style={{
                fontSize: "11px",
                letterSpacing: "0.12em",
                color: "rgba(221,213,196,0.4)",
                fontWeight: 700,
              }}
            >
              {row.category}
            </span>
            <span
              style={{
                fontSize: "12px",
                letterSpacing: "0.1em",
                color: "#B33D0E",
                fontWeight: 700,
              }}
            >
              {row.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * CLARITY + ANIMATION UPGRADE — the results are now a choreographed reveal
 * (ink wipe → profile name types out → palette stamps in → five-style
 * breakdown bars animate) followed by clearly numbered per-flow conclusion
 * sections: 01 STYLE / 02 BUDGET / 03 ROOM, so every part of the quiz gets
 * an explicit answer. Click anywhere (or reduced-motion) skips the show.
 */

export function useRevealStages(count: any, delays: any) {
  /* The staged reveal always plays — it is gentle (timed fades) and
     click-anywhere-to-skip is the explicit opt-out. Auto-skipping on the
     reduce-motion setting silently erased the whole choreography. */
  const [stage, setStage] = useState(0);
  /* FIX #7: hold delays in a ref — the array literal gets a new identity on
     every render, and as an effect dependency it silently reset the running
     stage timer whenever anything re-rendered (the typewriter alone re-renders
     every 55ms), stalling the reveal partway through. */
  const delaysRef = useRef(delays);
  delaysRef.current = delays;
  useEffect(() => {
    if (stage >= count) return;
    const id = setTimeout(
      () => setStage((s) => s + 1),
      delaysRef.current[stage] ?? 500,
    );
    return () => clearTimeout(id);
  }, [stage, count]);
  return [stage, () => setStage(count)];
}

export function useTypewriter(text: any, active: any, speed: any = 55) {
  const [n, setN] = useState(active ? 0 : text.length);
  useEffect(() => {
    if (!active) {
      setN(text.length);
      return;
    }
    setN(0);
    const id = setInterval(() => {
      setN((cur) => {
        if (cur >= text.length) {
          clearInterval(id);
          return cur;
        }
        return cur + 1;
      });
    }, speed);
    return () => clearInterval(id);
  }, [text, active, speed]);
  return text.slice(0, n);
}

/** Look up an option label by question id + answer id across all flows. */
export function lookupLabel(qid: any, ansId: any) {
  const q = [...STYLE_QUESTIONS, ...BUDGET_QUESTIONS, ...ROOM_QUESTIONS].find(
    (x) => x.id === qid,
  );
  if (!q || !ansId) return null;
  return (q.options ?? []).find((o) => o.id === ansId)?.label ?? null;
}

export function SectionNumber({ n, label, onRevisit }: any) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "baseline",
        gap: "12px",
        marginBottom: "18px",
      }}
    >
      <span
        className="q-display"
        style={{
          fontSize: "clamp(22px, 3vw, 34px)",
          fontWeight: 700,
          color: "transparent",
          WebkitTextStroke: "1px #B33D0E",
          letterSpacing: "-0.02em",
          lineHeight: 1,
        }}
      >
        {n}
      </span>
      <span
        style={{
          fontSize: "13px",
          letterSpacing: "0.26em",
          color: "#B33D0E",
          fontWeight: 700,
        }}
      >
        {label}
      </span>
      <div
        style={{
          flex: 1,
          height: "1px",
          backgroundColor: "rgba(221,213,196,0.12)",
          alignSelf: "center",
        }}
      />
      {onRevisit && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRevisit();
          }}
          style={{
            fontSize: "10px",
            letterSpacing: "0.18em",
            fontWeight: 700,
            color: "rgba(221,213,196,0.5)",
            background: "none",
            border: "1px solid rgba(221,213,196,0.3)",
            padding: "5px 10px",
            cursor: "pointer",
            transition: "color 0.2s, border-color 0.2s",
            flexShrink: 0,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "#B33D0E";
            e.currentTarget.style.borderColor = "#B33D0E";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "rgba(221,213,196,0.35)";
            e.currentTarget.style.borderColor = "rgba(221,213,196,0.2)";
          }}
        >
          REVISIT <Icon name="external" size={10} />
        </button>
      )}
    </div>
  );
}

export function StyleBreakdownBars({ ranked, animate }: any) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        maxWidth: "460px",
      }}
    >
      {ranked.map((r, i) => {
        const p = STYLE_PROFILES[r.key];
        const isTop = i === 0;
        return (
          <div key={r.key}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "4px",
              }}
            >
              <span
                style={{
                  fontSize: "11px",
                  letterSpacing: "0.16em",
                  fontWeight: 700,
                  color: isTop ? "#DDD5C4" : "rgba(221,213,196,0.4)",
                }}
              >
                {p.name}
              </span>
              <span
                style={{
                  fontSize: "11px",
                  letterSpacing: "0.1em",
                  fontWeight: 700,
                  color: isTop ? "#B33D0E" : "rgba(221,213,196,0.35)",
                }}
              >
                {r.pct}%
              </span>
            </div>
            <div
              style={{
                height: isTop ? "8px" : "5px",
                backgroundColor: "rgba(221,213,196,0.08)",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: animate ? `${r.pct}%` : "0%",
                  backgroundColor: isTop ? "#B33D0E" : "rgba(221,213,196,0.3)",
                  transition: "width 0.9s cubic-bezier(0.22, 1, 0.36, 1)",
                  transitionDelay: `${i * 120}ms`,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Inline staged fade — mounts hidden, transitions to visible next frame. */
export function FadeIn({ children, delay = 0, style }: any) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    let r2;
    const r1 = requestAnimationFrame(() => {
      r2 = requestAnimationFrame(() => setOn(true));
    });
    return () => {
      if (typeof cancelAnimationFrame === "function") {
        cancelAnimationFrame(r1);
        if (r2) cancelAnimationFrame(r2);
      }
    };
  }, []);
  return (
    <div
      style={{
        opacity: on ? 1 : 0,
        transition: `opacity 0.5s cubic-bezier(0.22, 1, 0.36, 1) ${delay}ms`,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function ResultLabel({ children }: any) {
  return (
    <span
      style={{
        fontSize: "11px",
        letterSpacing: "0.2em",
        color: "rgba(221,213,196,0.3)",
        fontWeight: 700,
        display: "block",
        marginBottom: "12px",
      }}
    >
      {children}
    </span>
  );
}
