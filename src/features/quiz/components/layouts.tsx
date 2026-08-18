// @ts-nocheck

"use client";

import { useEffect, useRef, useState } from "react";
import {
  QUIZ_PAD_X,
  OptionPill,
  OptionBlock,
  QHeader,
  flexCol,
  stagger,
  Icon,
  hexA,
} from "./shared";
import { ImageTile } from "./image-tile";
import {
  BUDGET_PRIORITY_OPTIONS,
  BUDGET_SPEND_OPTIONS,
  BUDGET_STRICTNESS_OPTIONS,
} from "@/features/quiz/data/budget-questions";

function useMultiToggle(question: any, answer: any, onAnswer: any) {
  const isMulti = question.type === "multi-select";
  const toggle = (id) => {
    if (isMulti) {
      const cur = Array.isArray(answer) ? answer : [];
      onAnswer(cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]);
    } else {
      onAnswer(id);
    }
  };
  const isSelected = (id) =>
    isMulti
      ? (Array.isArray(answer) ? answer : []).includes(id)
      : answer === id;
  return { isMulti, toggle, isSelected };
}

function LayoutFullColorSplit({ question, answer, onAnswer }: any) {
  const { toggle, isSelected } = useMultiToggle(question, answer, onAnswer);
  if (question.type === "life-reality") {
    return (
      <LayoutLifeReality
        question={question}
        answer={answer}
        onAnswer={onAnswer}
      />
    );
  }
  const opts = question.options ?? [];
  return (
    <div
      style={{
        ...flexCol,
        flex: 1,
        padding: `40px ${QUIZ_PAD_X} 0`,
        gap: "40px",
      }}
      role="group"
      aria-labelledby="q-text"
    >
      <div style={{ flex: 1, display: "flex", alignItems: "flex-start" }}>
        <h1
          id="q-text"
          style={{
            color: question.accent,
            fontSize: "clamp(22px, 4vw, 48px)",
            lineHeight: 1.1,
            letterSpacing: "0.06em",
            fontWeight: 700,
            textTransform: "uppercase",
            maxWidth: "420px",
          }}
        >
          {question.question}
        </h1>
      </div>
      <div
        style={{
          ...flexCol,
          gap: "12px",
          maxWidth: "420px",
          width: "100%",
          paddingBottom: "8px",
        }}
      >
        {opts.map((opt) => (
          <OptionBlock
            key={opt.id}
            label={opt.label}
            sublabel={opt.sublabel}
            selected={isSelected(opt.id)}
            accent={question.accent}
            bg={question.bg}
            onClick={() => toggle(opt.id)}
          />
        ))}
      </div>
    </div>
  );
}

function LayoutGhostType({ question, answer, onAnswer }: any) {
  const { toggle, isSelected } = useMultiToggle(question, answer, onAnswer);
  const ghostWord = question.question.split(" ")[0];
  const opts = question.options ?? [];
  return (
    <div
      style={{
        ...flexCol,
        flex: 1,
        justifyContent: "flex-end",
        padding: `0 ${QUIZ_PAD_X}`,
        position: "relative",
      }}
      role="group"
      aria-labelledby="q-text"
    >
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          fontSize: "clamp(80px, 18vw, 200px)",
          fontWeight: 700,
          letterSpacing: "-0.04em",
          color: "transparent",
          WebkitTextStroke: `1px ${question.accent}`,
          opacity: 0.12,
          whiteSpace: "nowrap",
          userSelect: "none",
          pointerEvents: "none",
          lineHeight: 1,
        }}
      >
        {ghostWord}
      </div>
      <h1
        id="q-text"
        style={{
          color: question.accent,
          fontSize: "clamp(13px, 2vw, 18px)",
          letterSpacing: "0.12em",
          fontWeight: 700,
          marginBottom: "32px",
          lineHeight: 1.4,
          position: "relative",
          zIndex: 1,
        }}
      >
        {question.question}
      </h1>
      <div
        style={{
          position: "relative",
          zIndex: 1,
          marginBottom: "32px",
          display: "flex",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        {opts.map((opt) => (
          <OptionPill
            key={opt.id}
            label={opt.label}
            selected={isSelected(opt.id)}
            accent={question.accent}
            bg={question.bg}
            onClick={() => toggle(opt.id)}
          />
        ))}
      </div>
    </div>
  );
}

function LayoutScatteredChips({ question, answer, onAnswer }: any) {
  const { toggle, isSelected } = useMultiToggle(question, answer, onAnswer);
  const opts = question.options ?? [];

  /* > 6 options → wrapping flow layout (source behaviour) */
  if (opts.length > 6) {
    return (
      <div
        style={{ ...flexCol, flex: 1, padding: `24px ${QUIZ_PAD_X} 0` }}
        role="group"
        aria-labelledby="q-text"
      >
        <h1
          id="q-text"
          style={{
            color: question.accent,
            fontSize: "clamp(13px, 2vw, 16px)",
            letterSpacing: "0.12em",
            fontWeight: 700,
            marginBottom: "28px",
            lineHeight: 1.4,
          }}
        >
          {question.question}
        </h1>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
          {opts.map((opt) => (
            <OptionPill
              key={opt.id}
              label={opt.label}
              selected={isSelected(opt.id)}
              accent={question.accent}
              bg={question.bg}
              onClick={() => toggle(opt.id)}
            />
          ))}
        </div>
      </div>
    );
  }

  const positions = [
    { top: "20%", left: "8%", rotate: "-2deg" },
    { top: "28%", left: "48%", rotate: "1deg" },
    { top: "42%", left: "22%", rotate: "-1deg" },
    { top: "55%", left: "58%", rotate: "2deg" },
    { top: "68%", left: "10%", rotate: "-1.5deg" },
    { top: "72%", left: "42%", rotate: "0.5deg" },
  ];

  return (
    <div
      style={{ position: "relative", flex: 1, minHeight: "420px" }}
      role="group"
      aria-labelledby="q-text"
    >
      <h1
        id="q-text"
        style={{
          position: "absolute",
          top: "28px",
          left: QUIZ_PAD_X,
          color: question.accent,
          fontSize: "clamp(13px, 2vw, 16px)",
          letterSpacing: "0.12em",
          fontWeight: 700,
          maxWidth: "260px",
          lineHeight: 1.4,
          zIndex: 2,
        }}
      >
        {question.question}
      </h1>
      {opts.map((opt, i) => {
        const pos = positions[i] || {};
        const sel = isSelected(opt.id);
        return (
          <button
            key={opt.id}
            onClick={() => toggle(opt.id)}
            role="radio"
            aria-checked={sel}
            className="q-stagger"
            style={{
              ...stagger(i, 60),
              position: "absolute",
              top: pos.top,
              left: pos.left,
              transform: `rotate(${pos.rotate || "0deg"})`,
              border: `1.5px solid ${sel ? question.accent : "rgba(255,255,255,0.28)"}`,
              backgroundColor: sel ? question.accent : "transparent",
              color: sel ? question.bg : "rgba(255,255,255,0.85)",
              padding: "10px 18px",
              fontSize: "12px",
              letterSpacing: "0.16em",
              fontWeight: 700,
              cursor: "pointer",
              transition: "all 0.2s",
              whiteSpace: "nowrap",
              zIndex: 2,
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function LayoutVerticalSplit({ question, answer, onAnswer }: any) {
  const opts = question.options ?? [];
  return (
    <div style={{ ...flexCol, flex: 1 }} role="group" aria-labelledby="q-text">
      <h1
        id="q-text"
        style={{
          color: question.accent,
          fontSize: "clamp(13px, 2vw, 17px)",
          letterSpacing: "0.12em",
          fontWeight: 700,
          padding: `32px ${QUIZ_PAD_X} 24px`,
          lineHeight: 1.5,
        }}
      >
        {question.question}
      </h1>
      <div style={{ display: "flex", flex: 1 }}>
        {opts.map((opt, i) => {
          const sel = answer === opt.id;
          return (
            <button
              key={opt.id}
              onClick={() => onAnswer(opt.id)}
              role="radio"
              aria-checked={sel}
              style={{
                flex: 1,
                display: "flex",
                alignItems: "flex-end",
                justifyContent: "flex-start",
                padding: "20px 14px",
                backgroundColor: sel
                  ? question.accent
                  : i % 2 === 0
                    ? "rgba(0,0,0,0.06)"
                    : "transparent",
                border: "none",
                borderLeft: i > 0 ? "1px solid rgba(255,255,255,0.12)" : "none",
                color: sel ? question.bg : "rgba(255,255,255,0.75)",
                fontSize: "12px",
                letterSpacing: "0.14em",
                fontWeight: 700,
                cursor: "pointer",
                transition: "all 0.25s",
                writingMode: "vertical-rl",
                textOrientation: "mixed",
              }}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function LayoutOffsetComposition({ question, answer, onAnswer }: any) {
  const opts = question.options ?? [];
  return (
    <div
      style={{ position: "relative", flex: 1, minHeight: "400px" }}
      role="group"
      aria-labelledby="q-text"
    >
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          bottom: "10%",
          left: "-2%",
          fontSize: "clamp(120px, 22vw, 260px)",
          fontWeight: 700,
          color: "transparent",
          WebkitTextStroke: `1px ${question.accent}`,
          opacity: 0.07,
          lineHeight: 1,
          userSelect: "none",
          pointerEvents: "none",
          letterSpacing: "-0.05em",
        }}
      >
        05
      </div>
      <h1
        id="q-text"
        style={{
          position: "absolute",
          top: "28px",
          right: QUIZ_PAD_X,
          color: question.accent,
          fontSize: "clamp(13px, 2vw, 16px)",
          letterSpacing: "0.10em",
          fontWeight: 700,
          maxWidth: "280px",
          textAlign: "right",
          lineHeight: 1.5,
          zIndex: 2,
        }}
      >
        {question.question}
      </h1>
      <div
        style={{
          position: "absolute",
          bottom: "12%",
          right: QUIZ_PAD_X,
          ...flexCol,
          gap: "10px",
          zIndex: 2,
        }}
      >
        {opts.map((opt) => (
          <OptionPill
            key={opt.id}
            label={opt.label}
            selected={answer === opt.id}
            accent={question.accent}
            bg={question.bg}
            onClick={() => onAnswer(opt.id)}
            style={{ textAlign: "right" }}
          />
        ))}
      </div>
    </div>
  );
}

function LayoutGiantTypeSmallOptions({ question, answer, onAnswer }: any) {
  const opts = question.options ?? [];
  const firstWord = question.question.split(" ")[0];
  return (
    <div
      style={{
        ...flexCol,
        flex: 1,
        justifyContent: "space-between",
        padding: `20px ${QUIZ_PAD_X} 0`,
      }}
      role="group"
      aria-labelledby="q-text"
    >
      <div
        aria-hidden="true"
        style={{
          fontSize: "clamp(60px, 14vw, 160px)",
          fontWeight: 700,
          letterSpacing: "-0.03em",
          color: question.accent,
          lineHeight: 0.95,
          userSelect: "none",
          opacity: 0.9,
        }}
      >
        {firstWord}
      </div>
      <h1
        id="q-text"
        style={{
          color: question.accent,
          fontSize: "12px",
          letterSpacing: "0.14em",
          fontWeight: 700,
          margin: "16px 0 20px",
          opacity: 0.7,
        }}
      >
        {question.question}
      </h1>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "8px",
          marginBottom: "8px",
        }}
      >
        {opts.map((opt) => (
          <OptionPill
            key={opt.id}
            label={opt.label}
            selected={answer === opt.id}
            accent={question.accent}
            bg={question.bg}
            onClick={() => onAnswer(opt.id)}
            style={{ display: "block", width: "100%", textAlign: "left" }}
          />
        ))}
      </div>
    </div>
  );
}

function LayoutTwoColumnGrid({ question, answer, onAnswer }: any) {
  const { toggle, isSelected } = useMultiToggle(question, answer, onAnswer);
  if (question.type === "image-grid") {
    return (
      <LayoutImageGrid
        question={question}
        answer={answer}
        onAnswer={onAnswer}
      />
    );
  }
  const opts = question.options ?? [];
  return (
    <div
      style={{ ...flexCol, flex: 1, padding: `28px ${QUIZ_PAD_X} 0` }}
      role="group"
      aria-labelledby="q-text"
    >
      <h1
        id="q-text"
        style={{
          color: question.accent,
          fontSize: "clamp(14px, 2vw, 20px)",
          letterSpacing: "0.10em",
          fontWeight: 700,
          marginBottom: "28px",
          lineHeight: 1.4,
          maxWidth: "480px",
        }}
      >
        {question.question}
      </h1>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "10px",
          flex: 1,
          maxHeight: "340px",
        }}
      >
        {opts.map((opt) => {
          const sel = isSelected(opt.id);
          return (
            <button
              key={opt.id}
              onClick={() => toggle(opt.id)}
              role="radio"
              aria-checked={sel}
              style={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "flex-end",
                padding: "18px",
                border: `1.5px solid ${sel ? question.accent : "rgba(255,255,255,0.18)"}`,
                backgroundColor: sel
                  ? question.accent
                  : "rgba(255,255,255,0.04)",
                color: sel ? question.bg : "rgba(255,255,255,0.8)",
                fontSize: "13px",
                letterSpacing: "0.12em",
                fontWeight: 700,
                cursor: "pointer",
                transition: "all 0.22s",
                textAlign: "left",
                lineHeight: 1.4,
                minHeight: "80px",
              }}
            >
              <span style={{ display: "block" }}>{opt.label}</span>
              {opt.sublabel && (
                <span
                  style={{
                    display: "block",
                    fontSize: "11px",
                    opacity: 0.65,
                    marginTop: "4px",
                    letterSpacing: "0.08em",
                    fontWeight: 400,
                    lineHeight: 1.5,
                  }}
                >
                  {opt.sublabel}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function LayoutHoverReactive({ question, answer, onAnswer }: any) {
  const [hovered, setHovered] = useState(null);
  const { toggle, isSelected } = useMultiToggle(question, answer, onAnswer);
  const opts = question.options ?? [];
  return (
    <div style={{ ...flexCol, flex: 1 }} role="group" aria-labelledby="q-text">
      <h1
        id="q-text"
        style={{
          color: question.accent,
          fontSize: "clamp(13px, 2vw, 17px)",
          letterSpacing: "0.12em",
          fontWeight: 700,
          padding: `24px ${QUIZ_PAD_X} 16px`,
          lineHeight: 1.5,
        }}
      >
        {question.question}
      </h1>
      <div style={{ ...flexCol, flex: 1 }}>
        {opts.map((opt, i) => {
          const sel = isSelected(opt.id);
          const isHov = hovered === opt.id;
          return (
            <button
              key={opt.id}
              onClick={() => toggle(opt.id)}
              onMouseEnter={() => setHovered(opt.id)}
              onMouseLeave={() => setHovered(null)}
              role="radio"
              aria-checked={sel}
              className="q-stagger"
              style={{
                ...stagger(i, 40),
                flex: 1,
                display: "flex",
                alignItems: "center",
                paddingLeft: QUIZ_PAD_X,
                border: "none",
                borderTop: "1px solid rgba(255,255,255,0.1)",
                backgroundColor: sel
                  ? question.accent
                  : isHov
                    ? "rgba(255,255,255,0.05)"
                    : "transparent",
                color: sel ? question.bg : "rgba(255,255,255,0.8)",
                fontSize: "clamp(12px, 1.8vw, 16px)",
                letterSpacing: "0.12em",
                fontWeight: 700,
                cursor: "pointer",
                transition: "all 0.2s",
                textAlign: "left",
                minHeight: "48px",
              }}
            >
              <span
                style={{
                  marginRight: "16px",
                  fontSize: "12px",
                  opacity: 0.4,
                  letterSpacing: "0.06em",
                }}
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function LayoutEditorialStack({ question, answer, onAnswer }: any) {
  if (question.type === "sliders") {
    return (
      <LayoutSliders question={question} answer={answer} onAnswer={onAnswer} />
    );
  }
  const opts = question.options ?? [];
  return (
    <div
      style={{
        ...flexCol,
        flex: 1,
        justifyContent: "center",
        padding: `20px ${QUIZ_PAD_X}`,
      }}
      role="group"
      aria-labelledby="q-text"
    >
      <div
        style={{
          display: "flex",
          gap: "32px",
          alignItems: "flex-start",
          flexWrap: "wrap",
        }}
      >
        <div style={{ flex: "1 1 280px", minWidth: "220px" }}>
          <h1
            id="q-text"
            style={{
              color: question.accent,
              fontSize: "clamp(15px, 2.2vw, 22px)",
              letterSpacing: "0.08em",
              fontWeight: 700,
              lineHeight: 1.35,
            }}
          >
            {question.question}
          </h1>
        </div>
        <div style={{ flex: "1 1 240px", ...flexCol, gap: "10px" }}>
          {opts.map((opt, i) => {
            const sel = answer === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => onAnswer(opt.id)}
                role="radio"
                aria-checked={sel}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  border: `1.5px solid ${sel ? question.accent : "rgba(255,255,255,0.18)"}`,
                  backgroundColor: sel ? question.accent : "transparent",
                  color: sel ? question.bg : "rgba(255,255,255,0.8)",
                  padding: "16px 18px",
                  fontSize: "13px",
                  letterSpacing: "0.12em",
                  fontWeight: 700,
                  cursor: "pointer",
                  transition: "all 0.22s",
                  textAlign: "left",
                }}
              >
                <span
                  style={{
                    fontSize: "11px",
                    opacity: sel ? 0.6 : 0.3,
                    letterSpacing: "0.1em",
                  }}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function LayoutFullBleedStatement({ question, answer, onAnswer }: any) {
  if (question.type === "free-text") {
    return (
      <LayoutFreeText question={question} answer={answer} onAnswer={onAnswer} />
    );
  }
  const opts = question.options ?? [];
  return (
    <div
      style={{
        ...flexCol,
        flex: 1,
        justifyContent: "center",
        padding: `0 ${QUIZ_PAD_X}`,
        position: "relative",
      }}
      role="group"
      aria-labelledby="q-text"
    >
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "clamp(60px, 16vw, 180px)",
          fontWeight: 700,
          color: "transparent",
          WebkitTextStroke: `1px ${question.accent}`,
          opacity: 0.05,
          userSelect: "none",
          pointerEvents: "none",
          letterSpacing: "-0.04em",
          lineHeight: 1,
        }}
      >
        FEEL
      </div>
      <h1
        id="q-text"
        style={{
          color: question.accent,
          fontSize: "clamp(24px, 5vw, 56px)",
          fontWeight: 700,
          letterSpacing: "0.04em",
          lineHeight: 1.1,
          maxWidth: "520px",
          marginBottom: "36px",
          position: "relative",
          zIndex: 1,
        }}
      >
        {question.question}
      </h1>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "12px",
          position: "relative",
          zIndex: 1,
        }}
      >
        {opts.map((opt) => (
          <OptionPill
            key={opt.id}
            label={opt.label}
            selected={answer === opt.id}
            accent={question.accent}
            bg={question.bg}
            onClick={() => onAnswer(opt.id)}
          />
        ))}
      </div>
    </div>
  );
}

function LayoutImageGrid({ question, answer, onAnswer }: any) {
  const imgOpts = question.imageOptions ?? [];
  const isMulti =
    (question.minSelect ?? 1) > 1 || (question.maxSelect ?? 1) > 1;
  const selected = isMulti ? (Array.isArray(answer) ? answer : []) : null;

  const toggle = (id) => {
    if (isMulti) {
      const cur = Array.isArray(answer) ? answer : [];
      const max = question.maxSelect ?? 99;
      if (cur.includes(id)) onAnswer(cur.filter((x) => x !== id));
      else if (cur.length < max) onAnswer([...cur, id]);
    } else {
      onAnswer(id);
    }
  };

  return (
    <div
      style={{ ...flexCol, flex: 1, padding: `20px ${QUIZ_PAD_X} 0` }}
      role="group"
      aria-labelledby="q-text"
    >
      <QHeader question={question} big />
      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            imgOpts.length === 4 ? "1fr 1fr" : "repeat(3, 1fr)",
          gap: "8px",
          flex: 1,
          paddingBottom: "8px",
        }}
      >
        {imgOpts.map((opt, imgIndex) => {
          const sel = isMulti ? selected.includes(opt.id) : answer === opt.id;
          return (
            <button
              key={opt.id}
              onClick={() => toggle(opt.id)}
              role="checkbox"
              aria-checked={sel}
              className="q-stagger"
              style={{
                ...stagger(imgIndex, 60),
                position: "relative",
                overflow: "hidden",
                border: `2px solid ${sel ? question.accent : "transparent"}`,
                cursor: "pointer",
                padding: 0,
                background: "none",
                minHeight: "120px",
                transition: "border-color 0.2s",
              }}
            >
              {/* FIX #5: gradient placeholder replaces next/image + local pool */}
              <ImageTile styleKey={opt.style} seed={imgIndex + opt.id.length} />
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "flex-end",
                  padding: "12px",
                  background:
                    "linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 60%)",
                }}
              >
                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: 700,
                    letterSpacing: "0.14em",
                    color: sel ? question.accent : "#fff",
                    display: "block",
                    transition: "color 0.2s",
                    textAlign: "left",
                  }}
                >
                  {opt.label}
                </span>
                {opt.sublabel && (
                  <span
                    style={{
                      fontSize: "11px",
                      color: "rgba(255,255,255,0.65)",
                      letterSpacing: "0.06em",
                      display: "block",
                      marginTop: "3px",
                      lineHeight: 1.4,
                      textAlign: "left",
                    }}
                  >
                    {opt.sublabel}
                  </span>
                )}
              </div>
              {sel && (
                <div
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    top: "10px",
                    right: "10px",
                    width: "20px",
                    height: "20px",
                    backgroundColor: question.accent,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path
                      d="M1 4L3.5 6.5L9 1"
                      stroke={question.bg}
                      strokeWidth="1.5"
                      strokeLinecap="square"
                    />
                  </svg>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * INTERACTIVE UPGRADE — palette immersion. Hovering a palette previews it
 * across the entire page (background + accent pulled from its swatches);
 * selecting one keeps you living inside it. `ui.setThemeOverride` is held
 * by the app and merged into the question theme before rendering.
 */
export function paletteTheme(card: any) {
  return { bg: card.swatches[4], accent: card.swatches[0] };
}

function LayoutPaletteCards({ question, answer, onAnswer, ui }: any) {
  const cards = question.paletteCards ?? [];
  const selectedCard = cards.find((c) => c.id === answer) ?? null;

  const preview = (card) =>
    ui?.setThemeOverride(
      card
        ? paletteTheme(card)
        : selectedCard
          ? paletteTheme(selectedCard)
          : null,
    );

  return (
    <div
      style={{ ...flexCol, flex: 1, padding: `20px ${QUIZ_PAD_X} 0` }}
      role="group"
      aria-labelledby="q-text"
    >
      <QHeader question={question} big />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
          gap: "12px",
          flex: 1,
          alignContent: "start",
          paddingBottom: "8px",
        }}
      >
        {cards.map((card, ci) => {
          const sel = answer === card.id;
          return (
            <button
              key={card.id}
              onClick={() => {
                onAnswer(card.id);
                ui?.setThemeOverride(paletteTheme(card));
              }}
              onMouseEnter={() => preview(card)}
              onMouseLeave={() => preview(null)}
              onFocus={() => preview(card)}
              onBlur={() => preview(null)}
              role="radio"
              aria-checked={sel}
              className="q-stagger"
              style={{
                display: "flex",
                flexDirection: "column",
                border: `2px solid ${sel ? question.accent : hexA(question.accent, 0.25)}`,
                backgroundColor: sel
                  ? hexA(question.accent, 0.1)
                  : hexA(question.accent, 0.04),
                cursor: "pointer",
                padding: "14px",
                transition: "all 0.2s",
                textAlign: "left",
                ...stagger(ci, 35),
              }}
            >
              <div
                style={{ display: "flex", gap: "3px", marginBottom: "10px" }}
              >
                {card.swatches.map((hex, i) => (
                  <div
                    key={i}
                    style={{
                      flex: 1,
                      height: sel ? "34px" : "28px",
                      backgroundColor: hex,
                      transition: "height 0.25s cubic-bezier(0.22, 1, 0.36, 1)",
                    }}
                  />
                ))}
              </div>
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: 700,
                  letterSpacing: "0.18em",
                  color: sel ? question.accent : hexA(question.accent, 0.6),
                  transition: "color 0.2s",
                }}
              >
                {card.name}
                {sel && (
                  <span style={{ marginLeft: "8px", opacity: 0.7 }}>
                    — YOU'RE IN IT
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>
      <p
        style={{
          fontSize: "11px",
          letterSpacing: "0.18em",
          color: question.accent,
          opacity: 0.35,
          fontWeight: 700,
          paddingBottom: "8px",
        }}
      >
        HOVER TO TRY A PALETTE ON — THE PAGE WEARS IT
      </p>
    </div>
  );
}

function LayoutBinaryPairs({ question, answer, onAnswer }: any) {
  const pairs = question.binaryPairs ?? [];
  const current = answer && typeof answer === "object" ? answer : {};
  const choose = (pairId, side) => onAnswer({ ...current, [pairId]: side });

  const sideBtn = (pair, side, chosen) => (
    <button
      onClick={() => choose(pair.id, side)}
      role="radio"
      aria-checked={chosen === side}
      style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: side === "left" ? "flex-start" : "flex-end",
        paddingLeft: side === "left" ? 0 : "16px",
        paddingRight: side === "left" ? "16px" : 0,
        fontSize: "13px",
        fontWeight: 700,
        letterSpacing: "0.12em",
        color:
          chosen === side
            ? question.accent
            : chosen
              ? "rgba(255,255,255,0.22)"
              : "rgba(255,255,255,0.7)",
        background: "none",
        border: "none",
        cursor: "pointer",
        transition: "color 0.18s",
        textAlign: side === "left" ? "left" : "right",
      }}
    >
      {side === "left" ? pair.left : pair.right}
    </button>
  );

  return (
    <div
      style={{ ...flexCol, flex: 1, padding: `20px ${QUIZ_PAD_X} 0` }}
      role="group"
      aria-labelledby="q-text"
    >
      <QHeader question={question} />
      <div style={{ ...flexCol, gap: "4px" }}>
        {pairs.map((pair, i) => {
          const chosen = current[pair.id];
          return (
            <div
              key={pair.id}
              role="radiogroup"
              aria-label={`${pair.left} or ${pair.right}`}
              className="q-stagger"
              style={{
                ...stagger(i, 40),
                display: "flex",
                alignItems: "stretch",
                height: "48px",
                borderBottom: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              {sideBtn(pair, "left", chosen)}
              <div
                style={{
                  width: "32px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    width: "6px",
                    height: "6px",
                    borderRadius: "50%",
                    backgroundColor: chosen
                      ? question.accent
                      : "rgba(255,255,255,0.2)",
                    transition: "background-color 0.18s",
                  }}
                />
              </div>
              {sideBtn(pair, "right", chosen)}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * ART DIRECTION PASS — the sliders question is now an editorial spec sheet:
 * constrained measure, outlined index numerals, a tick ruler, a live reading
 * that names which pole you're leaning toward, and a line-art furniture
 * silhouette per row that physically morphs as you drag (the sofa grows
 * sculptural, the pendant light descends, the cabinet opens into shelves).
 */
function lerp(a: any, b: any, t: any) {
  return a + (b - a) * t;
}

function SliderGlyph({ kind, t, accent }: any) {
  const s = { stroke: accent, fill: "none", strokeWidth: 2 };
  const dim = hexA(accent, 0.35);
  let art = null;

  if (kind === "sofa") {
    const w = lerp(96, 132, t);
    const x0 = (170 - w) / 2;
    const seatH = lerp(12, 22, t);
    const seatY = 58 - seatH;
    const armW = lerp(7, 16, t);
    const backY = lerp(30, 18, t);
    const r = lerp(1, 8, t);
    art = (
      <>
        {/* legs fade as it grows floor-hugging */}
        <line
          x1={x0 + 10}
          y1={58}
          x2={x0 + 10}
          y2={66}
          {...s}
          opacity={1 - t * 0.85}
        />
        <line
          x1={x0 + w - 10}
          y1={58}
          x2={x0 + w - 10}
          y2={66}
          {...s}
          opacity={1 - t * 0.85}
        />
        {/* back */}
        <rect
          x={x0 + armW - 2}
          y={backY}
          width={w - 2 * armW + 4}
          height={seatY - backY + 4}
          rx={r}
          {...s}
        />
        {/* seat */}
        <rect x={x0} y={seatY} width={w} height={seatH} rx={r} {...s} />
        {/* arms */}
        <rect
          x={x0}
          y={lerp(40, 30, t)}
          width={armW}
          height={58 - lerp(40, 30, t)}
          rx={r}
          {...s}
        />
        <rect
          x={x0 + w - armW}
          y={lerp(40, 30, t)}
          width={armW}
          height={58 - lerp(40, 30, t)}
          rx={r}
          {...s}
        />
        {/* seat cushion split appears as it gets plush */}
        <line
          x1={85}
          y1={seatY + 3}
          x2={85}
          y2={seatY + seatH - 3}
          stroke={accent}
          strokeWidth="1.5"
          opacity={t}
        />
      </>
    );
  } else if (kind === "table") {
    const topH = lerp(2.5, 11, t);
    const legW = lerp(1.5, 5, t);
    art = (
      <>
        {/* top: glass sliver → solid slab */}
        <rect
          x={30}
          y={34}
          width={110}
          height={topH}
          {...s}
          strokeWidth={lerp(1.5, 2, t)}
        />
        {/* glass sheen, fades out */}
        <line
          x1={42}
          y1={34 + topH / 2}
          x2={70}
          y2={34 + topH / 2}
          stroke={accent}
          strokeWidth="1"
          opacity={(1 - t) * 0.7}
        />
        {/* legs thicken */}
        <line
          x1={40}
          y1={34 + topH}
          x2={40}
          y2={64}
          stroke={accent}
          strokeWidth={legW}
        />
        <line
          x1={130}
          y1={34 + topH}
          x2={130}
          y2={64}
          stroke={accent}
          strokeWidth={legW}
        />
        {/* lower shelf (glass) fades, plinth beam (solid) fades in */}
        <line
          x1={38}
          y1={54}
          x2={132}
          y2={54}
          stroke={accent}
          strokeWidth="1.2"
          opacity={(1 - t) * 0.8}
        />
        <rect
          x={36}
          y={58}
          width={98}
          height={lerp(0.01, 5, t)}
          {...s}
          opacity={t}
        />
      </>
    );
  } else if (kind === "lighting") {
    const cord = lerp(4, 26, t);
    const dome = lerp(3, 17, t);
    art = (
      <>
        {/* ceiling */}
        <line
          x1={20}
          y1={10}
          x2={150}
          y2={10}
          stroke={accent}
          strokeWidth="2"
        />
        {/* recessed spots, fade out */}
        {[55, 85, 115].map((x) => (
          <rect
            key={x}
            x={x - 3}
            y={8}
            width={6}
            height={4}
            fill={accent}
            opacity={(1 - t) * 0.9}
            stroke="none"
          />
        ))}
        {/* pendant grows down */}
        <line
          x1={85}
          y1={10}
          x2={85}
          y2={10 + cord}
          stroke={accent}
          strokeWidth={lerp(1, 2, t)}
          opacity={Math.min(1, t * 2)}
        />
        <path
          d={`M ${85 - dome} ${10 + cord + dome} A ${dome} ${dome} 0 0 1 ${85 + dome} ${10 + cord + dome}`}
          {...s}
          opacity={Math.min(1, t * 2)}
        />
        <circle
          cx={85}
          cy={10 + cord + dome - 2}
          r={lerp(0.5, 2.5, t)}
          fill={accent}
          stroke="none"
          opacity={t}
        />
        {/* light rays at full statement */}
        {[-1, 0, 1].map((d) => (
          <line
            key={d}
            x1={85 + d * 10}
            y1={10 + cord + dome + 4}
            x2={85 + d * 16}
            y2={10 + cord + dome + 12}
            stroke={accent}
            strokeWidth="1"
            opacity={Math.max(0, t - 0.6) * 2}
          />
        ))}
      </>
    );
  } else if (kind === "storage") {
    art = (
      <>
        <rect x={35} y={16} width={100} height={46} {...s} />
        {/* closed doors: center seam + knobs, fade out */}
        <line
          x1={85}
          y1={16}
          x2={85}
          y2={62}
          stroke={accent}
          strokeWidth="1.5"
          opacity={1 - t}
        />
        <circle
          cx={79}
          cy={39}
          r={1.8}
          fill={accent}
          stroke="none"
          opacity={1 - t}
        />
        <circle
          cx={91}
          cy={39}
          r={1.8}
          fill={accent}
          stroke="none"
          opacity={1 - t}
        />
        {/* open shelves fade in */}
        {[31, 46].map((y) => (
          <line
            key={y}
            x1={35}
            y1={y}
            x2={135}
            y2={y}
            stroke={accent}
            strokeWidth="1.5"
            opacity={t}
          />
        ))}
        {/* objects appear on shelves */}
        <rect
          x={44}
          y={22}
          width={7}
          height={9}
          {...s}
          strokeWidth="1.2"
          opacity={Math.max(0, t - 0.35) * 1.6}
        />
        <circle
          cx={100}
          cy={26.5}
          r={4}
          {...s}
          strokeWidth="1.2"
          opacity={Math.max(0, t - 0.5) * 2}
        />
        <rect
          x={112}
          y={37}
          width={12}
          height={9}
          {...s}
          strokeWidth="1.2"
          opacity={Math.max(0, t - 0.45) * 1.9}
        />
        <line
          x1={52}
          y1={41}
          x2={52}
          y2={46}
          stroke={accent}
          strokeWidth="3"
          opacity={Math.max(0, t - 0.55) * 2.3}
        />
        <line
          x1={58}
          y1={39}
          x2={58}
          y2={46}
          stroke={accent}
          strokeWidth="3"
          opacity={Math.max(0, t - 0.6) * 2.6}
        />
      </>
    );
  } else {
    /* dining */
    const topH = lerp(2.5, 8, t);
    const legW = lerp(1.5, 5, t);
    art = (
      <>
        <rect
          x={25}
          y={30}
          width={120}
          height={topH}
          {...s}
          strokeWidth={lerp(1.5, 2, t)}
        />
        <line
          x1={38}
          y1={30 + topH}
          x2={34}
          y2={64}
          stroke={accent}
          strokeWidth={legW}
        />
        <line
          x1={132}
          y1={30 + topH}
          x2={136}
          y2={64}
          stroke={accent}
          strokeWidth={legW}
        />
        {/* trestle beam fades in */}
        <line
          x1={40}
          y1={52}
          x2={130}
          y2={52}
          stroke={accent}
          strokeWidth={lerp(0.5, 3, t)}
          opacity={t}
        />
        {/* candlesticks / formality appear */}
        <line
          x1={75}
          y1={30}
          x2={75}
          y2={lerp(30, 21, t)}
          stroke={accent}
          strokeWidth="1.5"
          opacity={t}
        />
        <line
          x1={95}
          y1={30}
          x2={95}
          y2={lerp(30, 21, t)}
          stroke={accent}
          strokeWidth="1.5"
          opacity={t}
        />
        <circle
          cx={75}
          cy={lerp(30, 19, t)}
          r={1.4}
          fill={accent}
          stroke="none"
          opacity={Math.max(0, t - 0.4) * 1.7}
        />
        <circle
          cx={95}
          cy={lerp(30, 19, t)}
          r={1.4}
          fill={accent}
          stroke="none"
          opacity={Math.max(0, t - 0.4) * 1.7}
        />
      </>
    );
  }

  return (
    <svg
      viewBox="0 0 170 80"
      width="170"
      height="80"
      aria-hidden="true"
      style={{ display: "block", overflow: "visible" }}
    >
      {/* ground line */}
      <line x1={14} y1={68} x2={156} y2={68} stroke={dim} strokeWidth="1" />
      {art}
    </svg>
  );
}

function LayoutSliders({ question, answer, onAnswer }: any) {
  const sliders = question.sliders ?? [];
  const current = answer && typeof answer === "object" ? answer : {};
  const setValue = (id, val) => onAnswer({ ...current, [id]: val });

  return (
    <div
      style={{ ...flexCol, flex: 1, padding: `20px ${QUIZ_PAD_X} 0` }}
      role="group"
      aria-labelledby="q-text"
    >
      <QHeader question={question} big />
      <div style={{ ...flexCol, maxWidth: "940px", paddingBottom: "16px" }}>
        {sliders.map((slider, i) => {
          const val = current[slider.id] ?? 50;
          const t = val / 100;
          const lean = val < 38 ? "left" : val > 62 ? "right" : "center";
          return (
            <div
              key={slider.id}
              className="q-stagger"
              style={{
                ...stagger(i, 60),
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                gap: "10px 28px",
                padding: "18px 0",
                borderTop: `1px solid ${hexA(question.accent, 0.15)}`,
              }}
            >
              {/* rail: outlined numeral + label + live reading */}
              <div style={{ flex: "0 0 150px" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    gap: "10px",
                  }}
                >
                  <span
                    aria-hidden="true"
                    className="q-display"
                    style={{
                      fontSize: "26px",
                      fontWeight: 700,
                      color: "transparent",
                      WebkitTextStroke: `1px ${hexA(question.accent, 0.55)}`,
                      lineHeight: 1,
                    }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span
                    style={{
                      fontSize: "12px",
                      letterSpacing: "0.22em",
                      fontWeight: 700,
                      color: question.accent,
                    }}
                  >
                    {slider.label}
                  </span>
                </div>
                <div
                  style={{
                    marginTop: "8px",
                    fontSize: "11px",
                    letterSpacing: "0.16em",
                    fontWeight: 700,
                    color:
                      lean === "center"
                        ? hexA(question.accent, 0.45)
                        : question.accent,
                    minHeight: "12px",
                    transition: "color 0.2s",
                  }}
                >
                  {lean === "left" ? (
                    <>
                      <Icon
                        name="chevron"
                        size={9}
                        style={{ transform: "rotate(180deg)" }}
                      />{" "}
                      {slider.leftLabel}
                    </>
                  ) : lean === "right" ? (
                    <>
                      {slider.rightLabel} <Icon name="chevron" size={9} />
                    </>
                  ) : (
                    "BALANCED"
                  )}
                </div>
              </div>

              {/* live silhouette */}
              <div style={{ flex: "0 0 170px" }}>
                <SliderGlyph kind={slider.id} t={t} accent={question.accent} />
              </div>

              {/* gauge */}
              <div style={{ flex: "1 1 260px", minWidth: "220px" }}>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={val}
                  onChange={(e) => setValue(slider.id, Number(e.target.value))}
                  aria-label={slider.label}
                  style={{
                    width: "100%",
                    height: "2px",
                    color: question.accent,
                    background: `linear-gradient(to right, ${question.accent} 0%, ${question.accent} ${val}%, ${hexA(question.accent, 0.25)} ${val}%, ${hexA(question.accent, 0.25)} 100%)`,
                    outline: "none",
                    cursor: "pointer",
                  }}
                />
                {/* tick ruler */}
                <div
                  aria-hidden="true"
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginTop: "6px",
                    padding: "0 1px",
                  }}
                >
                  {Array.from({ length: 11 }).map((_, ti) => (
                    <div
                      key={ti}
                      style={{
                        width: "1px",
                        height: ti % 5 === 0 ? "7px" : "4px",
                        backgroundColor: hexA(
                          question.accent,
                          ti % 5 === 0 ? 0.5 : 0.25,
                        ),
                      }}
                    />
                  ))}
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginTop: "6px",
                  }}
                >
                  <span
                    style={{
                      fontSize: "11px",
                      letterSpacing: "0.1em",
                      fontWeight: 700,
                      color:
                        lean === "left"
                          ? question.accent
                          : hexA(question.accent, 0.35),
                      transition: "color 0.2s",
                    }}
                  >
                    {slider.leftLabel}
                  </span>
                  <span
                    style={{
                      fontSize: "11px",
                      letterSpacing: "0.1em",
                      fontWeight: 700,
                      color:
                        lean === "right"
                          ? question.accent
                          : hexA(question.accent, 0.35),
                      transition: "color 0.2s",
                    }}
                  >
                    {slider.rightLabel}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LayoutLifeReality({ question, answer, onAnswer }: any) {
  const groups = question.lifeRealityGroups ?? [];
  const current = answer && typeof answer === "object" ? answer : {};
  const choose = (groupId, optionId) =>
    onAnswer({ ...current, [groupId]: optionId });
  const darkText = question.bg === "#DDD5C4";

  return (
    <div
      style={{ ...flexCol, flex: 1, padding: `20px ${QUIZ_PAD_X} 0` }}
      role="group"
      aria-labelledby="q-text"
    >
      <QHeader question={question} big />
      <div style={{ ...flexCol, gap: "24px" }}>
        {groups.map((group, gi) => (
          <div key={group.id} className="q-stagger" style={stagger(gi, 70)}>
            <span
              style={{
                display: "block",
                fontSize: "11px",
                letterSpacing: "0.22em",
                fontWeight: 700,
                color: question.accent,
                opacity: 0.5,
                marginBottom: "10px",
              }}
            >
              {group.label}
            </span>
            <div
              role="radiogroup"
              aria-label={group.label}
              style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}
            >
              {group.options.map((opt) => {
                const sel = current[group.id] === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => choose(group.id, opt.id)}
                    role="radio"
                    aria-checked={sel}
                    style={{
                      border: `1.5px solid ${sel ? question.accent : darkText ? "rgba(0,0,0,0.25)" : "rgba(255,255,255,0.2)"}`,
                      backgroundColor: sel ? question.accent : "transparent",
                      color: sel
                        ? question.bg
                        : darkText
                          ? "rgba(0,0,0,0.6)"
                          : "rgba(255,255,255,0.75)",
                      padding: "9px 16px",
                      fontSize: "12px",
                      letterSpacing: "0.12em",
                      fontWeight: 700,
                      cursor: "pointer",
                      transition: "all 0.18s",
                    }}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function LayoutFreeText({ question, answer, onAnswer }: any) {
  const placeholders = question.placeholders ?? [];
  const [phIdx] = useState(() =>
    Math.floor(Math.random() * Math.max(1, placeholders.length)),
  );
  const placeholder = placeholders[phIdx] ?? "describe your ideal space...";

  return (
    <div
      style={{ ...flexCol, flex: 1, padding: `20px ${QUIZ_PAD_X} 0` }}
      role="group"
      aria-labelledby="q-text"
    >
      <h1
        id="q-text"
        style={{
          color: question.accent,
          fontSize: "clamp(22px, 4vw, 52px)",
          fontWeight: 700,
          letterSpacing: "0.04em",
          lineHeight: 1.1,
          marginBottom: question.subtext ? "8px" : "32px",
        }}
      >
        {question.question}
      </h1>
      {question.subtext && (
        <p
          style={{
            color: question.accent,
            opacity: 0.55,
            fontSize: "13px",
            letterSpacing: "0.1em",
            marginBottom: "32px",
          }}
        >
          {question.subtext}
        </p>
      )}
      <div
        style={{
          borderBottom: `1.5px solid ${question.accent}`,
          paddingBottom: "4px",
          marginBottom: "12px",
        }}
      >
        <textarea
          value={typeof answer === "string" ? answer : ""}
          onChange={(e) => onAnswer(e.target.value)}
          placeholder={placeholder}
          aria-label={question.question}
          rows={4}
          style={{
            width: "100%",
            background: "transparent",
            border: "none",
            outline: "none",
            color: question.accent,
            fontSize: "clamp(14px, 2.5vw, 22px)",
            fontFamily: "inherit",
            letterSpacing: "0.06em",
            lineHeight: 1.6,
            resize: "none",
            caretColor: question.accent,
          }}
        />
      </div>
      <p
        style={{
          fontSize: "11px",
          letterSpacing: "0.16em",
          color: question.accent,
          opacity: 0.3,
          fontWeight: 700,
        }}
      >
        OPTIONAL. SKIP WITH NEXT
      </p>
    </div>
  );
}

function CategoryRows({ question, answer, onAnswer, options, selColor }: any) {
  const cats = question.categories ?? [];
  const current = answer && typeof answer === "object" ? answer : {};
  const choose = (catId, optId) => onAnswer({ ...current, [catId]: optId });

  return (
    <div
      style={{ ...flexCol, flex: 1, padding: `20px ${QUIZ_PAD_X} 0` }}
      role="group"
      aria-labelledby="q-text"
    >
      <QHeader question={question} />
      <div style={{ ...flexCol }}>
        {cats.map((cat, i) => (
          <div
            key={cat.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "16px",
              flexWrap: "wrap",
              borderTop: "1px solid rgba(255,255,255,0.08)",
              padding: "12px 0",
              borderBottom:
                i === cats.length - 1
                  ? "1px solid rgba(255,255,255,0.08)"
                  : "none",
            }}
          >
            <span
              style={{
                fontSize: "12px",
                fontWeight: 700,
                letterSpacing: "0.14em",
                color: question.accent,
                minWidth: "160px",
              }}
            >
              {cat.label}
            </span>
            <div
              role="radiogroup"
              aria-label={cat.label}
              style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}
            >
              {options.map((opt) => {
                const sel = current[cat.id] === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => choose(cat.id, opt.id)}
                    role="radio"
                    aria-checked={sel}
                    style={{
                      border: `1px solid ${sel ? question.accent : "rgba(255,255,255,0.18)"}`,
                      backgroundColor: sel ? question.accent : "transparent",
                      color: sel ? selColor : "rgba(255,255,255,0.55)",
                      padding: "7px 14px",
                      fontSize: "11px",
                      letterSpacing: "0.14em",
                      fontWeight: 700,
                      cursor: "pointer",
                      transition: "all 0.18s",
                    }}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function LayoutCategoryPriority(props: any) {
  return (
    <CategoryRows
      {...props}
      options={BUDGET_PRIORITY_OPTIONS}
      selColor="#1a1714"
    />
  );
}
function LayoutCategorySpend(props: any) {
  return (
    <CategoryRows
      {...props}
      options={BUDGET_SPEND_OPTIONS}
      selColor="#DDD5C4"
    />
  );
}

function LayoutBudgetEntry({ question, answer, onAnswer }: any) {
  const current = answer && typeof answer === "object" ? answer : null;
  const path = current?.path;

  const pathBtn = (label, sub, p) => (
    <button
      onClick={() => onAnswer({ path: p })}
      style={{
        border: "1.5px solid rgba(255,255,255,0.25)",
        backgroundColor: "transparent",
        color: "rgba(255,255,255,0.85)",
        padding: `22px ${QUIZ_PAD_X}`,
        fontSize: "13px",
        letterSpacing: "0.14em",
        fontWeight: 700,
        cursor: "pointer",
        textAlign: "left",
        transition: "all 0.2s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = question.accent;
        e.currentTarget.style.color = question.accent;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "rgba(255,255,255,0.25)";
        e.currentTarget.style.color = "rgba(255,255,255,0.85)";
      }}
    >
      {label}
      <span
        style={{
          display: "block",
          fontSize: "12px",
          opacity: 0.5,
          marginTop: "4px",
          fontWeight: 400,
        }}
      >
        {sub}
      </span>
    </button>
  );

  const backBtn = (
    <button
      onClick={() => onAnswer({ path: undefined })}
      style={{
        fontSize: "11px",
        letterSpacing: "0.18em",
        color: "rgba(255,255,255,0.35)",
        background: "none",
        border: "none",
        cursor: "pointer",
        fontWeight: 700,
        padding: 0,
        marginBottom: "24px",
      }}
    >
      ← BACK
    </button>
  );

  return (
    <div
      style={{ ...flexCol, flex: 1, padding: `20px ${QUIZ_PAD_X} 0` }}
      role="group"
      aria-labelledby="q-text"
    >
      <h1
        id="q-text"
        style={{
          color: question.accent,
          fontSize: "clamp(22px, 4vw, 48px)",
          fontWeight: 700,
          letterSpacing: "0.06em",
          marginBottom: "8px",
        }}
      >
        {question.question}
      </h1>
      <p
        style={{
          color: question.accent,
          opacity: 0.5,
          fontSize: "13px",
          letterSpacing: "0.1em",
          marginBottom: "36px",
        }}
      >
        {question.subtext}
      </p>

      {!path && (
        <div style={{ ...flexCol, gap: "12px", maxWidth: "480px" }}>
          {pathBtn(
            "I KNOW MY BUDGET",
            "Enter a number and we will work within it",
            "know",
          )}
          {pathBtn(
            "HELP ME FIGURE IT OUT",
            "6 quick questions to estimate your budget",
            "guided",
          )}
        </div>
      )}

      {path === "know" && (
        <div style={{ maxWidth: "480px" }}>
          {backBtn}
          <div style={{ marginBottom: "24px" }}>
            <span
              style={{
                fontSize: "11px",
                letterSpacing: "0.2em",
                color: question.accent,
                opacity: 0.5,
                fontWeight: 700,
                display: "block",
                marginBottom: "10px",
              }}
            >
              YOUR BUDGET
            </span>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                borderBottom: `1.5px solid ${question.accent}`,
                paddingBottom: "6px",
              }}
            >
              <span
                style={{
                  color: question.accent,
                  fontSize: "24px",
                  fontWeight: 700,
                }}
              >
                $
              </span>
              <input
                type="number"
                min={0}
                value={current?.amount ?? ""}
                onChange={(e) =>
                  onAnswer({
                    path: "know",
                    amount:
                      e.target.value === ""
                        ? undefined
                        : Number(e.target.value),
                    strictness: current?.strictness,
                  })
                }
                placeholder="15000"
                aria-label="Budget amount"
                style={{
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  color: question.accent,
                  fontSize: "24px",
                  fontWeight: 700,
                  fontFamily: "inherit",
                  letterSpacing: "0.04em",
                  width: "100%",
                  caretColor: question.accent,
                }}
              />
            </div>
          </div>
          <span
            style={{
              fontSize: "11px",
              letterSpacing: "0.2em",
              color: question.accent,
              opacity: 0.5,
              fontWeight: 700,
              display: "block",
              marginBottom: "12px",
            }}
          >
            STRICTNESS
          </span>
          <div style={{ ...flexCol, gap: "8px" }}>
            {BUDGET_STRICTNESS_OPTIONS.map((s) => (
              <button
                key={s.id}
                onClick={() =>
                  onAnswer({
                    path: "know",
                    amount: current?.amount,
                    strictness: s.id,
                  })
                }
                style={{
                  border: `1.5px solid ${current?.strictness === s.id ? question.accent : "rgba(255,255,255,0.2)"}`,
                  backgroundColor:
                    current?.strictness === s.id
                      ? question.accent
                      : "transparent",
                  color:
                    current?.strictness === s.id
                      ? "#1a1714"
                      : "rgba(255,255,255,0.7)",
                  padding: "12px 18px",
                  fontSize: "12px",
                  letterSpacing: "0.12em",
                  fontWeight: 700,
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "all 0.18s",
                }}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {path === "guided" && (
        <div>
          {backBtn}
          <p
            style={{
              fontSize: "13px",
              letterSpacing: "0.06em",
              color: "rgba(255,255,255,0.6)",
              lineHeight: 1.6,
              maxWidth: "380px",
            }}
          >
            We will ask you 6 quick questions to recommend a realistic budget
            range. Hit NEXT to begin.
          </p>
        </div>
      )}
    </div>
  );
}

export function LayoutBudgetResult({ range, accent, bg }: any) {
  const fmt = (n) => "$" + n.toLocaleString("en-US");
  return (
    <div
      style={{
        padding: `20px ${QUIZ_PAD_X}`,
        border: `1.5px solid ${accent}`,
        maxWidth: "400px",
        backgroundColor: bg,
      }}
    >
      <span
        style={{
          fontSize: "11px",
          letterSpacing: "0.2em",
          color: accent,
          opacity: 0.5,
          fontWeight: 700,
          display: "block",
          marginBottom: "10px",
        }}
      >
        RECOMMENDED BUDGET RANGE
      </span>
      <div
        style={{
          fontSize: "clamp(24px, 5vw, 48px)",
          fontWeight: 700,
          color: accent,
          letterSpacing: "-0.02em",
          lineHeight: 1,
        }}
      >
        {fmt(range[0])} to {fmt(range[1])}
      </div>
      <p
        style={{
          fontSize: "12px",
          color: accent,
          opacity: 0.45,
          letterSpacing: "0.1em",
          marginTop: "8px",
        }}
      >
        Adjust in the priority section below.
      </p>
    </div>
  );
}

/** Draggable room footprint — 1ft grid, corner handle resizes, live sq ft. */
const ROOM_MIN_FT = 6;
const ROOM_MAX_FT = 30;

function RoomRect({ width, length, accent, onChange }: any) {
  const svgRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const SCALE = 9; /* px per ft */
  const PAD = 20;
  const VW = ROOM_MAX_FT * SCALE + PAD * 2;
  const VH = ROOM_MAX_FT * SCALE * 0.72 + PAD * 2;
  const clampFt = (v) =>
    Number.isFinite(v)
      ? Math.max(ROOM_MIN_FT, Math.min(ROOM_MAX_FT, Math.round(v)))
      : ROOM_MIN_FT;
  const w = Math.max(ROOM_MIN_FT, Math.min(ROOM_MAX_FT, width || 12));
  const l = Math.max(ROOM_MIN_FT, Math.min(ROOM_MAX_FT, length || 12));
  const rw = w * SCALE;
  const rl = l * SCALE * 0.72; /* foreshorten depth so wide rooms fit */

  const fromEvent = (e) => {
    const svg = svgRef.current;
    if (!svg) return { w, l };
    const rect = svg.getBoundingClientRect();
    if (!rect.width || !rect.height)
      return { w, l }; /* guard zero-size layouts */
    const x = ((e.clientX - rect.left) / rect.width) * VW;
    const y = ((e.clientY - rect.top) / rect.height) * VH;
    return {
      w: clampFt((x - PAD) / SCALE),
      l: clampFt((y - PAD) / (SCALE * 0.72)),
    };
  };
  const onPointerDown = (e) => {
    e.preventDefault();
    setDragging(true);
    svgRef.current?.setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e) => {
    if (!dragging) return;
    const n = fromEvent(e);
    if (n.w !== w || n.l !== l) onChange(n.w, n.l);
  };
  const stop = () => setDragging(false);
  const grid = [];
  for (let ft = 5; ft <= ROOM_MAX_FT; ft += 5) {
    grid.push(
      <line
        key={"v" + ft}
        x1={PAD + ft * SCALE}
        y1={PAD}
        x2={PAD + ft * SCALE}
        y2={VH - PAD}
        stroke={hexA(accent, 0.08)}
        strokeWidth="1"
      />,
      <line
        key={"h" + ft}
        x1={PAD}
        y1={PAD + ft * SCALE * 0.72}
        x2={VW - PAD}
        y2={PAD + ft * SCALE * 0.72}
        stroke={hexA(accent, 0.08)}
        strokeWidth="1"
      />,
    );
  }

  return (
    <div
      className="q-stagger"
      style={{ maxWidth: "460px", marginBottom: "26px", ...stagger(1) }}
    >
      <svg
        ref={svgRef}
        viewBox={`0 0 ${VW} ${VH}`}
        style={{
          width: "100%",
          display: "block",
          touchAction: "none",
          userSelect: "none",
        }}
        onPointerMove={onPointerMove}
        onPointerUp={stop}
        onPointerCancel={stop}
        aria-hidden="true"
      >
        {grid}
        {/* room footprint */}
        <rect
          x={PAD}
          y={PAD}
          width={rw}
          height={rl}
          fill={hexA(accent, dragging ? 0.1 : 0.05)}
          stroke={accent}
          strokeWidth="2.5"
          style={{ transition: dragging ? "none" : "all 0.25s ease" }}
        />
        {/* dimensions */}
        <text
          x={PAD + rw / 2}
          y={PAD - 7}
          textAnchor="middle"
          fill={accent}
          fontSize="11"
          fontWeight="700"
          letterSpacing="1.5"
          style={{ fontFamily: "inherit" }}
        >
          {w} FT
        </text>
        <text
          x={PAD - 7}
          y={PAD + rl / 2}
          textAnchor="middle"
          fill={accent}
          fontSize="11"
          fontWeight="700"
          letterSpacing="1.5"
          transform={`rotate(-90 ${PAD - 7} ${PAD + rl / 2})`}
          style={{ fontFamily: "inherit" }}
        >
          {l} FT
        </text>
        {/* sq-ft readout inside the room */}
        <text
          x={PAD + rw / 2}
          y={PAD + rl / 2 + 4}
          textAnchor="middle"
          fill={accent}
          fontSize="14"
          fontWeight="700"
          letterSpacing="2"
          opacity="0.75"
          style={{ fontFamily: "inherit" }}
        >
          {w * l} SQ FT
        </text>
        {/* corner drag handle */}
        <g onPointerDown={onPointerDown} style={{ cursor: "nwse-resize" }}>
          <circle cx={PAD + rw} cy={PAD + rl} r="16" fill="transparent" />
          <rect
            x={PAD + rw - 6}
            y={PAD + rl - 6}
            width="12"
            height="12"
            fill={dragging ? accent : "transparent"}
            stroke={accent}
            strokeWidth="2"
            style={{ transition: "fill 0.15s ease" }}
          />
          <line
            x1={PAD + rw + 8}
            y1={PAD + rl + 8}
            x2={PAD + rw + 15}
            y2={PAD + rl + 15}
            stroke={accent}
            strokeWidth="2"
          />
          <line
            x1={PAD + rw + 12}
            y1={PAD + rl + 4}
            x2={PAD + rw + 17}
            y2={PAD + rl + 9}
            stroke={accent}
            strokeWidth="1.4"
            opacity="0.6"
          />
        </g>
      </svg>
      <span
        style={{
          fontSize: "10px",
          letterSpacing: "0.18em",
          color: accent,
          opacity: 0.4,
          fontWeight: 700,
        }}
      >
        DRAG THE CORNER TO RESIZE THE ROOM
      </span>
    </div>
  );
}

function LayoutRoomSize({ question, answer, onAnswer }: any) {
  const current = answer && typeof answer === "object" ? answer : {};
  const presets = question.options ?? [];
  const presetDims = {
    "r4-sm": { width: 10, length: 10 },
    "r4-st": { width: 12, length: 12 },
    "r4-lg": { width: 14, length: 16 },
  };
  const choosePreset = (id) => {
    const d = presetDims[id] ?? {};
    onAnswer({
      preset: id,
      width: d.width,
      length: d.length,
      ceiling: current.ceiling,
    });
  };

  return (
    <div
      style={{ ...flexCol, flex: 1, padding: `20px ${QUIZ_PAD_X} 0` }}
      role="group"
      aria-labelledby="q-text"
    >
      <h1
        id="q-text"
        style={{
          color: question.accent,
          fontSize: "clamp(22px, 4vw, 40px)",
          fontWeight: 700,
          letterSpacing: "0.06em",
          marginBottom: "8px",
        }}
      >
        {question.question}
      </h1>
      {question.subtext && (
        <p
          style={{
            color: question.accent,
            opacity: 0.5,
            fontSize: "13px",
            letterSpacing: "0.1em",
            marginBottom: "28px",
          }}
        >
          {question.subtext}
        </p>
      )}
      <div
        style={{
          display: "flex",
          gap: "10px",
          marginBottom: "28px",
          flexWrap: "wrap",
        }}
      >
        {presets.map((p) => {
          const sel = current.preset === p.id;
          return (
            <button
              key={p.id}
              onClick={() => choosePreset(p.id)}
              style={{
                border: `1.5px solid ${sel ? question.accent : "rgba(0,0,0,0.2)"}`,
                backgroundColor: sel ? question.accent : "transparent",
                color: sel ? question.bg : "rgba(0,0,0,0.6)",
                padding: "14px 22px",
                fontSize: "13px",
                letterSpacing: "0.14em",
                fontWeight: 700,
                cursor: "pointer",
                transition: "all 0.2s",
                textAlign: "left",
              }}
            >
              <span style={{ display: "block" }}>{p.label}</span>
              {p.sublabel && (
                <span
                  style={{
                    display: "block",
                    fontSize: "11px",
                    opacity: 0.6,
                    marginTop: "3px",
                  }}
                >
                  {p.sublabel}
                </span>
              )}
            </button>
          );
        })}
      </div>
      {/* ── INTERACTIVE UPGRADE: drag the room itself. The corner handle
          resizes width/length with a live sq-ft readout; presets and the
          manual inputs below stay in perfect sync. ── */}
      <RoomRect
        width={current.width ?? 12}
        length={current.length ?? 12}
        accent={question.accent}
        onChange={(w, l) =>
          onAnswer({ ...current, preset: undefined, width: w, length: l })
        }
      />
      <span
        style={{
          fontSize: "11px",
          letterSpacing: "0.2em",
          color: question.accent,
          opacity: 0.5,
          fontWeight: 700,
          display: "block",
          marginBottom: "14px",
        }}
      >
        OR ENTER MANUALLY
      </span>
      <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
        {[
          { key: "width", label: "WIDTH (FT)" },
          { key: "length", label: "LENGTH (FT)" },
          { key: "ceiling", label: "CEILING HEIGHT (FT)" },
        ].map(({ key, label }) => (
          <div key={key} style={{ flex: "1 1 100px" }}>
            <span
              style={{
                fontSize: "11px",
                letterSpacing: "0.16em",
                color: question.accent,
                opacity: 0.45,
                fontWeight: 700,
                display: "block",
                marginBottom: "6px",
              }}
            >
              {label}
            </span>
            <div
              style={{
                borderBottom: `1.5px solid ${question.accent}`,
                paddingBottom: "4px",
              }}
            >
              <input
                type="number"
                min={1}
                value={current[key] ?? ""}
                onChange={(e) =>
                  onAnswer({
                    ...current,
                    preset: undefined,
                    [key]:
                      e.target.value === ""
                        ? undefined
                        : Number(e.target.value),
                  })
                }
                aria-label={label}
                style={{
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  color: question.accent,
                  fontSize: "20px",
                  fontWeight: 700,
                  fontFamily: "inherit",
                  width: "100%",
                  caretColor: question.accent,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const OPENING_TYPES = [
  "Single Door",
  "Double Door",
  "Sliding Door",
  "Standard Window",
  "Floor-to-Ceiling Window",
  "Bay Window",
];

/**
 * INTERACTIVE UPGRADE — doors & windows are now placed on a live floor
 * plan. Click a wall to add an opening where you clicked, drag an opening
 * along its wall to reposition, click it to select, and use the control
 * bar (or the fallback list) to change its type or remove it. Data shape
 * gains `pos` (0..1 along the wall) on top of the original {type, wall}.
 */
const WALL_ORDER = ["N", "E", "S", "W"];

function LayoutOpenings({ question, answer, onAnswer }: any) {
  const current = Array.isArray(answer) ? answer : [];
  const [selectedIdx, setSelectedIdx] = useState(null);
  const dragRef = useRef(null); // { idx } while dragging an opening
  const svgRef = useRef(null);

  const W = 340;
  const H = 240;
  const PAD = 26;

  const setAll = (next) => onAnswer(next);
  const updateOpening = (i, patch) =>
    setAll(current.map((o, idx) => (idx === i ? { ...o, ...patch } : o)));
  const removeOpening = (i) => {
    setAll(current.filter((_, idx) => idx !== i));
    setSelectedIdx(null);
  };
  const addOpening = (wall = "N", pos = 0.5, type = OPENING_TYPES[0]) => {
    setAll([...current, { type, wall, pos }]);
    setSelectedIdx(current.length);
  };

  /* geometry helpers: wall → point at fraction t */
  const wallPoint = (wall, t) => {
    if (wall === "N") return { x: PAD + t * (W - 2 * PAD), y: PAD };
    if (wall === "S") return { x: PAD + t * (W - 2 * PAD), y: H - PAD };
    if (wall === "W") return { x: PAD, y: PAD + t * (H - 2 * PAD) };
    return { x: W - PAD, y: PAD + t * (H - 2 * PAD) };
  };
  const svgPointFromEvent = (e) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * W,
      y: ((e.clientY - rect.top) / rect.height) * H,
    };
  };
  const nearestWall = (p) => {
    const d = {
      N: Math.abs(p.y - PAD),
      S: Math.abs(p.y - (H - PAD)),
      W: Math.abs(p.x - PAD),
      E: Math.abs(p.x - (W - PAD)),
    };
    const wall = WALL_ORDER.reduce((a, b) => (d[a] <= d[b] ? a : b));
    const t =
      wall === "N" || wall === "S"
        ? (p.x - PAD) / (W - 2 * PAD)
        : (p.y - PAD) / (H - 2 * PAD);
    return { wall, pos: Math.max(0.06, Math.min(0.94, t)) };
  };

  const onWallClick = (e) => {
    if (dragRef.current || justDragged.current) {
      justDragged.current = false;
      return;
    }
    const p = svgPointFromEvent(e);
    /* only accept clicks reasonably close to a wall */
    const distToWall = Math.min(
      Math.abs(p.y - PAD),
      Math.abs(p.y - (H - PAD)),
      Math.abs(p.x - PAD),
      Math.abs(p.x - (W - PAD)),
    );
    if (distToWall > 28) return;
    const { wall, pos } = nearestWall(p);
    addOpening(wall, pos);
  };
  const onOpeningPointerDown = (e, i) => {
    e.stopPropagation();
    setSelectedIdx(i);
    dragRef.current = { idx: i, moved: false };
    svgRef.current?.setPointerCapture?.(e.pointerId);
  };
  const onSvgPointerMove = (e) => {
    if (!dragRef.current) return;
    dragRef.current.moved = true;
    const { wall, pos } = nearestWall(svgPointFromEvent(e));
    updateOpening(dragRef.current.idx, { wall, pos });
  };
  const justDragged = useRef(false);
  const onSvgPointerUp = () => {
    if (dragRef.current?.moved) justDragged.current = true;
    dragRef.current = null;
  };

  const isWindow = (type) => type.includes("Window");
  const sel = selectedIdx != null ? current[selectedIdx] : null;

  const ctrlBtn = (label, onClick, danger) => (
    <button
      onClick={onClick}
      style={{
        border: `1px solid ${danger ? "rgba(255,120,90,0.6)" : hexA(question.accent, 0.4)}`,
        backgroundColor: "transparent",
        color: danger ? "rgba(255,140,110,0.9)" : question.accent,
        padding: "8px 12px",
        fontSize: "11px",
        letterSpacing: "0.14em",
        fontWeight: 700,
        cursor: "pointer",
        transition: "all 0.18s",
      }}
    >
      {label}
    </button>
  );

  return (
    <div
      style={{ ...flexCol, flex: 1, padding: `20px ${QUIZ_PAD_X} 0` }}
      role="group"
      aria-labelledby="q-text"
    >
      <h1
        id="q-text"
        style={{
          color: question.accent,
          fontSize: "clamp(22px, 4vw, 40px)",
          fontWeight: 700,
          letterSpacing: "0.06em",
          marginBottom: "8px",
        }}
      >
        {question.question}
      </h1>
      <p
        style={{
          color: question.accent,
          opacity: 0.5,
          fontSize: "13px",
          letterSpacing: "0.1em",
          marginBottom: "20px",
        }}
      >
        Click a wall to place an opening. Drag to move it. Click one to edit.
      </p>

      <div
        style={{
          display: "flex",
          gap: "28px",
          flexWrap: "wrap",
          alignItems: "flex-start",
        }}
      >
        {/* ── Floor plan ── */}
        <div
          className="q-stagger"
          style={{ flex: "0 1 380px", minWidth: "260px", ...stagger(0) }}
        >
          <svg
            ref={svgRef}
            viewBox={`0 0 ${W} ${H}`}
            style={{
              width: "100%",
              display: "block",
              cursor: "crosshair",
              touchAction: "none",
            }}
            onClick={onWallClick}
            onPointerMove={onSvgPointerMove}
            onPointerUp={onSvgPointerUp}
            onPointerCancel={onSvgPointerUp}
            aria-label="Room floor plan — click a wall to add a door or window"
          >
            {/* floor hatch */}
            <defs>
              <pattern
                id="fz-hatch"
                width="10"
                height="10"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M0 10 L10 0"
                  stroke={hexA(question.accent, 0.06)}
                  strokeWidth="1"
                />
              </pattern>
            </defs>
            <rect
              x={PAD}
              y={PAD}
              width={W - 2 * PAD}
              height={H - 2 * PAD}
              fill="url(#fz-hatch)"
            />
            {/* walls */}
            <rect
              x={PAD}
              y={PAD}
              width={W - 2 * PAD}
              height={H - 2 * PAD}
              fill="none"
              stroke={question.accent}
              strokeWidth="3"
            />
            {/* compass labels */}
            {[
              { w: "N", x: W / 2, y: 14 },
              { w: "S", x: W / 2, y: H - 6 },
              { w: "W", x: 10, y: H / 2 + 3 },
              { w: "E", x: W - 10, y: H / 2 + 3 },
            ].map(({ w, x, y }) => (
              <text
                key={w}
                x={x}
                y={y}
                textAnchor="middle"
                fill={question.accent}
                opacity="0.4"
                fontSize="10"
                fontWeight="700"
                letterSpacing="2"
                style={{ fontFamily: "inherit", userSelect: "none" }}
              >
                {w}
              </text>
            ))}
            {/* openings */}
            {current.map((o, i) => {
              const horiz = o.wall === "N" || o.wall === "S";
              const t = o.pos ?? 0.5;
              const p = wallPoint(o.wall, t);
              const span = isWindow(o.type) ? 34 : 26;
              const half = span / 2;
              const isSel = selectedIdx === i;
              const strokeMain = isSel
                ? question.accent
                : hexA(question.accent, 0.85);
              return (
                <g
                  key={i}
                  onPointerDown={(e) => onOpeningPointerDown(e, i)}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!dragRef.current?.moved) setSelectedIdx(i);
                  }}
                  style={{ cursor: "grab" }}
                >
                  {/* wall gap (erase wall behind the opening) */}
                  <line
                    x1={horiz ? p.x - half : p.x}
                    y1={horiz ? p.y : p.y - half}
                    x2={horiz ? p.x + half : p.x}
                    y2={horiz ? p.y : p.y + half}
                    stroke={question.bg}
                    strokeWidth="5"
                  />
                  {isWindow(o.type) ? (
                    /* window: twin thin lines */
                    <>
                      {[-2.5, 2.5].map((off) => (
                        <line
                          key={off}
                          x1={horiz ? p.x - half : p.x + off}
                          y1={horiz ? p.y + off : p.y - half}
                          x2={horiz ? p.x + half : p.x + off}
                          y2={horiz ? p.y + off : p.y + half}
                          stroke={strokeMain}
                          strokeWidth="1.6"
                        />
                      ))}
                    </>
                  ) : (
                    /* door: leaf + swing arc */
                    <>
                      <line
                        x1={p.x}
                        y1={p.y}
                        x2={
                          horiz
                            ? p.x + half
                            : p.x + (o.wall === "W" ? half : -half)
                        }
                        y2={horiz ? p.y + (o.wall === "N" ? half : -half) : p.y}
                        stroke={strokeMain}
                        strokeWidth="2"
                      />
                      <path
                        d={
                          horiz
                            ? `M ${p.x + half} ${p.y} A ${half} ${half} 0 0 ${o.wall === "N" ? 1 : 0} ${p.x} ${p.y + (o.wall === "N" ? half : -half)}`
                            : `M ${p.x} ${p.y + half} A ${half} ${half} 0 0 ${o.wall === "W" ? 1 : 0} ${p.x + (o.wall === "W" ? half : -half)} ${p.y}`
                        }
                        fill="none"
                        stroke={strokeMain}
                        strokeWidth="1"
                        strokeDasharray="3 3"
                        opacity="0.7"
                      />
                    </>
                  )}
                  {/* generous invisible hit target */}
                  <circle cx={p.x} cy={p.y} r="16" fill="transparent" />
                  {isSel && (
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r="7"
                      fill="none"
                      stroke={question.accent}
                      strokeWidth="1.5"
                    >
                      <animate
                        attributeName="r"
                        values="6;9;6"
                        dur="1.6s"
                        repeatCount="indefinite"
                      />
                    </circle>
                  )}
                </g>
              );
            })}
          </svg>

          {/* control bar for the selected opening */}
          <div
            style={{
              display: "flex",
              gap: "8px",
              marginTop: "12px",
              flexWrap: "wrap",
              minHeight: "34px",
            }}
          >
            {sel ? (
              <>
                {ctrlBtn(
                  <>
                    {sel.type.toUpperCase()} <Icon name="chevron" size={9} />
                  </>,
                  () =>
                    updateOpening(selectedIdx, {
                      type: OPENING_TYPES[
                        (OPENING_TYPES.indexOf(sel.type) + 1) %
                          OPENING_TYPES.length
                      ],
                    }),
                )}
                {ctrlBtn("REMOVE", () => removeOpening(selectedIdx), true)}
              </>
            ) : (
              <span
                style={{
                  fontSize: "11px",
                  letterSpacing: "0.16em",
                  color: question.accent,
                  opacity: 0.35,
                  fontWeight: 700,
                  alignSelf: "center",
                }}
              >
                {current.length === 0
                  ? "TAP ANY WALL TO START — OPTIONAL, SKIP WITH NEXT"
                  : "SELECT AN OPENING TO EDIT"}
              </span>
            )}
          </div>
        </div>

        {/* ── Fallback list (keyboard / screen-reader friendly) ── */}
        <div
          className="q-stagger"
          style={{ flex: "1 1 240px", minWidth: "220px", ...stagger(2) }}
        >
          <span
            style={{
              fontSize: "11px",
              letterSpacing: "0.2em",
              color: question.accent,
              opacity: 0.45,
              fontWeight: 700,
              display: "block",
              marginBottom: "10px",
            }}
          >
            OPENINGS ({current.length})
          </span>
          <div style={{ ...flexCol, gap: "8px", marginBottom: "12px" }}>
            {current.map((opening, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  border: `1px solid ${selectedIdx === i ? question.accent : hexA(question.accent, 0.2)}`,
                  padding: "8px 10px",
                  transition: "border-color 0.18s",
                }}
              >
                <select
                  value={opening.type}
                  onChange={(e) => updateOpening(i, { type: e.target.value })}
                  onFocus={() => setSelectedIdx(i)}
                  aria-label={`Opening ${i + 1} type`}
                  style={{
                    flex: 1,
                    background: "transparent",
                    border: "none",
                    outline: "none",
                    color: question.accent,
                    fontSize: "12px",
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    fontFamily: "inherit",
                    cursor: "pointer",
                  }}
                >
                  {OPENING_TYPES.map((t) => (
                    <option
                      key={t}
                      value={t}
                      style={{
                        backgroundColor: "#1a1714",
                        color: question.accent,
                      }}
                    >
                      {t.toUpperCase()}
                    </option>
                  ))}
                </select>
                <span
                  style={{
                    fontSize: "11px",
                    color: question.accent,
                    opacity: 0.5,
                    fontWeight: 700,
                    letterSpacing: "0.1em",
                  }}
                >
                  {opening.wall} · {Math.round((opening.pos ?? 0.5) * 100)}%
                </span>
                <button
                  onClick={() => removeOpening(i)}
                  aria-label={`Remove opening ${i + 1}`}
                  style={{
                    background: "none",
                    border: "none",
                    color: hexA(question.accent, 0.4),
                    cursor: "pointer",
                    fontSize: "14px",
                    lineHeight: 1,
                    padding: "0 2px",
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <button
            onClick={() => addOpening()}
            style={{
              border: `1.5px dashed ${hexA(question.accent, 0.35)}`,
              backgroundColor: "transparent",
              color: hexA(question.accent, 0.6),
              padding: "10px 16px",
              fontSize: "11px",
              letterSpacing: "0.18em",
              fontWeight: 700,
              cursor: "pointer",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = question.accent;
              e.currentTarget.style.color = question.accent;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = hexA(question.accent, 0.35);
              e.currentTarget.style.color = hexA(question.accent, 0.6);
            }}
          >
            + ADD OPENING
          </button>
        </div>
      </div>
    </div>
  );
}

function LayoutGroupedChecklist({ question, answer, onAnswer }: any) {
  const groups = question.checklistGroups ?? [];
  const selected = Array.isArray(answer) ? answer : [];
  const toggle = (id) =>
    onAnswer(
      selected.includes(id)
        ? selected.filter((x) => x !== id)
        : [...selected, id],
    );

  return (
    <div
      style={{ ...flexCol, flex: 1, padding: `20px ${QUIZ_PAD_X} 0` }}
      role="group"
      aria-labelledby="q-text"
    >
      <QHeader question={question} big />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
          gap: "24px",
          paddingBottom: "8px",
        }}
      >
        {groups.map((group, gi) => (
          <div key={group.id} className="q-stagger" style={stagger(gi, 70)}>
            <span
              style={{
                display: "block",
                fontSize: "11px",
                letterSpacing: "0.22em",
                fontWeight: 700,
                color: question.accent,
                opacity: 0.45,
                marginBottom: "10px",
                borderBottom: "1px solid rgba(0,0,0,0.1)",
                paddingBottom: "8px",
              }}
            >
              {group.label}
            </span>
            <div style={{ ...flexCol, gap: "6px" }}>
              {group.items.map((item) => {
                const sel = selected.includes(item.id);
                return (
                  <button
                    key={item.id}
                    onClick={() => toggle(item.id)}
                    role="checkbox"
                    aria-checked={sel}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: "4px 0",
                      textAlign: "left",
                    }}
                  >
                    <span
                      style={{
                        width: "14px",
                        height: "14px",
                        border: `1.5px solid ${sel ? question.accent : "rgba(0,0,0,0.3)"}`,
                        backgroundColor: sel ? question.accent : "transparent",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        transition: "all 0.18s",
                      }}
                    >
                      {sel && (
                        <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                          <path
                            d="M1 3L3 5L7 1"
                            stroke={question.bg}
                            strokeWidth="1.5"
                            strokeLinecap="square"
                          />
                        </svg>
                      )}
                    </span>
                    <span
                      style={{
                        fontSize: "13px",
                        fontWeight: 700,
                        letterSpacing: "0.1em",
                        color: sel ? question.accent : "rgba(0,0,0,0.65)",
                        transition: "color 0.18s",
                      }}
                    >
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function LayoutMagazineSpread({ question, answer, onAnswer }: any) {
  const opts = question.options ?? [];
  return (
    <div
      style={{ ...flexCol, flex: 1, overflow: "hidden" }}
      role="group"
      aria-labelledby="q-text"
    >
      <div
        style={{
          padding: `28px ${QUIZ_PAD_X} 20px`,
          borderBottom: "1px solid rgba(255,255,255,0.1)",
          display: "flex",
          alignItems: "flex-end",
          gap: "24px",
        }}
      >
        <h1
          id="q-text"
          style={{
            color: question.accent,
            fontSize: "clamp(22px, 4vw, 44px)",
            fontWeight: 700,
            letterSpacing: "0.06em",
            lineHeight: 1.05,
            flex: 1,
          }}
        >
          {question.question}
        </h1>
        {question.subtext && (
          <p
            style={{
              color: question.accent,
              opacity: 0.45,
              fontSize: "12px",
              letterSpacing: "0.12em",
              maxWidth: "220px",
              lineHeight: 1.6,
              textAlign: "right",
              flexShrink: 0,
            }}
          >
            {question.subtext}
          </p>
        )}
      </div>

      <div style={{ ...flexCol, flex: 1 }}>
        {opts.map((opt, i) => {
          const sel = answer === opt.id;
          return (
            <button
              key={opt.id}
              onClick={() => onAnswer(opt.id)}
              role="radio"
              aria-checked={sel}
              className="q-stagger"
              style={{
                ...stagger(i, 55),
                flex: 1,
                display: "flex",
                alignItems: "center",
                border: "none",
                borderBottom: "1px solid rgba(255,255,255,0.07)",
                backgroundColor: sel ? question.accent : "transparent",
                cursor: "pointer",
                padding: 0,
                transition: "background-color 0.22s",
                minHeight: "52px",
              }}
            >
              <div
                aria-hidden="true"
                style={{
                  width: "72px",
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "clamp(28px, 5vw, 56px)",
                  fontWeight: 700,
                  letterSpacing: "-0.04em",
                  color: sel ? question.bg : question.accent,
                  opacity: sel ? 0.25 : 0.12,
                  lineHeight: 1,
                  transition: "all 0.22s",
                  userSelect: "none",
                }}
              >
                {String(i + 1).padStart(2, "0")}
              </div>
              <div
                style={{
                  width: "1px",
                  alignSelf: "stretch",
                  backgroundColor: sel
                    ? "rgba(255,255,255,0.2)"
                    : "rgba(255,255,255,0.08)",
                  transition: "background-color 0.22s",
                  flexShrink: 0,
                  margin: "10px 0",
                }}
              />
              <div style={{ flex: 1, padding: "0 24px", textAlign: "left" }}>
                <span
                  style={{
                    display: "block",
                    fontSize: "clamp(12px, 1.8vw, 16px)",
                    fontWeight: 700,
                    letterSpacing: "0.12em",
                    color: sel ? question.bg : "rgba(255,255,255,0.82)",
                    transition: "color 0.22s",
                    lineHeight: 1.3,
                  }}
                >
                  {opt.label}
                </span>
                {opt.sublabel && (
                  <span
                    style={{
                      display: "block",
                      fontSize: "12px",
                      letterSpacing: "0.08em",
                      color: sel ? question.bg : "rgba(255,255,255,0.4)",
                      marginTop: "3px",
                      fontWeight: 400,
                      transition: "color 0.22s",
                    }}
                  >
                    {opt.sublabel}
                  </span>
                )}
              </div>
              <div
                style={{
                  width: "48px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  opacity: sel ? 1 : 0,
                  transition: "opacity 0.22s",
                }}
              >
                <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
                  <path
                    d="M1 5L4.5 8.5L11 1"
                    stroke={question.bg}
                    strokeWidth="1.5"
                    strokeLinecap="square"
                  />
                </svg>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function LayoutSplitTypewriter({ question, answer, onAnswer }: any) {
  const opts = question.options ?? [];
  const [cursorVisible, setCursorVisible] = useState(true);

  useEffect(() => {
    const id = setInterval(() => setCursorVisible((v) => !v), 530);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      style={{ display: "flex", flex: 1, overflow: "hidden", flexWrap: "wrap" }}
      role="group"
      aria-labelledby="q-text"
    >
      <div
        style={{
          flex: "1 1 55%",
          minWidth: "260px",
          ...flexCol,
          justifyContent: "flex-end",
          padding: "28px",
          borderRight: "1px solid rgba(255,255,255,0.08)",
          position: "relative",
        }}
      >
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            top: "16px",
            left: "22px",
            fontSize: "clamp(80px, 18vw, 180px)",
            fontWeight: 700,
            letterSpacing: "-0.05em",
            color: "transparent",
            WebkitTextStroke: `1px ${question.accent}`,
            opacity: 0.07,
            lineHeight: 1,
            userSelect: "none",
            pointerEvents: "none",
          }}
        >
          ?
        </div>
        <div
          style={{
            fontSize: "11px",
            letterSpacing: "0.22em",
            fontWeight: 700,
            color: question.accent,
            opacity: 0.4,
            marginBottom: "14px",
          }}
        >
          {question.flow?.toUpperCase()} / {question.section}
        </div>
        <h1
          id="q-text"
          style={{
            color: question.accent,
            fontSize: "clamp(20px, 4vw, 46px)",
            fontWeight: 700,
            letterSpacing: "0.04em",
            lineHeight: 1.15,
            position: "relative",
            zIndex: 1,
          }}
        >
          {question.question}
          <span
            aria-hidden="true"
            style={{
              display: "inline-block",
              width: "3px",
              height: "0.85em",
              backgroundColor: question.accent,
              marginLeft: "6px",
              verticalAlign: "middle",
              opacity: cursorVisible ? 1 : 0,
              transition: "opacity 0.1s",
            }}
          />
        </h1>
        {question.subtext && (
          <p
            style={{
              color: question.accent,
              opacity: 0.45,
              fontSize: "12px",
              letterSpacing: "0.12em",
              marginTop: "12px",
              lineHeight: 1.6,
              position: "relative",
              zIndex: 1,
            }}
          >
            {question.subtext}
          </p>
        )}
      </div>

      <div
        style={{
          flex: "1 1 280px",
          maxWidth: "340px",
          ...flexCol,
          justifyContent: "center",
          padding: `24px ${QUIZ_PAD_X}`,
        }}
      >
        {opts.map((opt, i) => {
          const sel = answer === opt.id;
          return (
            <button
              key={opt.id}
              onClick={() => onAnswer(opt.id)}
              role="radio"
              aria-checked={sel}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "14px",
                padding: "14px 0",
                background: "none",
                /* FIX #4: single clean declaration — the source stacked
                   borderBottom, border:"none", then three longhands. */
                border: "none",
                borderBottom: "1px solid rgba(255,255,255,0.07)",
                cursor: "pointer",
                textAlign: "left",
                transition: "opacity 0.18s",
              }}
            >
              <div
                style={{
                  width: "16px",
                  height: "16px",
                  border: `1.5px solid ${sel ? question.accent : "rgba(255,255,255,0.28)"}`,
                  borderRadius: "50%",
                  backgroundColor: sel ? question.accent : "transparent",
                  flexShrink: 0,
                  transition: "all 0.18s",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {sel && (
                  <div
                    style={{
                      width: "6px",
                      height: "6px",
                      borderRadius: "50%",
                      backgroundColor: question.bg,
                    }}
                  />
                )}
              </div>
              <div style={{ flex: 1 }}>
                <span
                  style={{
                    display: "block",
                    fontSize: "13px",
                    fontWeight: 700,
                    letterSpacing: "0.12em",
                    color: sel ? question.accent : "rgba(255,255,255,0.75)",
                    transition: "color 0.18s",
                    lineHeight: 1.3,
                  }}
                >
                  {opt.label}
                </span>
                {opt.sublabel && (
                  <span
                    style={{
                      display: "block",
                      fontSize: "11px",
                      color: sel ? question.accent : "rgba(255,255,255,0.35)",
                      letterSpacing: "0.08em",
                      marginTop: "2px",
                      fontWeight: 400,
                      transition: "color 0.18s",
                    }}
                  >
                    {opt.sublabel}
                  </span>
                )}
              </div>
              <span
                style={{
                  fontSize: "11px",
                  color: "rgba(255,255,255,0.2)",
                  letterSpacing: "0.08em",
                  fontWeight: 700,
                }}
              >
                {String(i + 1).padStart(2, "0")}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function LayoutPinboard({ question, answer, onAnswer }: any) {
  const { isMulti, toggle, isSelected } = useMultiToggle(
    question,
    answer,
    onAnswer,
  );
  const opts = question.options ?? [];
  const rotations = [
    -2.2, 1.5, -1, 2.8, -0.6, 1.8, -2, 0.8, -1.6, 2.2, -0.4, 1.2, -2.5, 1, -0.8,
    2, -1.4, 0.6, -2.1, 1.7, 0.3,
  ];

  return (
    <div
      style={{ ...flexCol, flex: 1, padding: `20px ${QUIZ_PAD_X} 0` }}
      role="group"
      aria-labelledby="q-text"
    >
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          marginBottom: "24px",
        }}
      >
        <h1
          id="q-text"
          style={{
            color: question.accent,
            fontSize: "clamp(14px, 2.2vw, 20px)",
            fontWeight: 700,
            letterSpacing: "0.1em",
            lineHeight: 1.3,
          }}
        >
          {question.question}
        </h1>
        {question.subtext && (
          <p
            style={{
              color: question.accent,
              opacity: 0.4,
              fontSize: "11px",
              letterSpacing: "0.12em",
              marginLeft: "20px",
              flexShrink: 0,
              fontWeight: 700,
            }}
          >
            {question.subtext}
          </p>
        )}
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "12px",
          alignContent: "flex-start",
        }}
      >
        {opts.map((opt, i) => {
          const sel = isSelected(opt.id);
          const rot = rotations[i % rotations.length];
          return (
            <button
              key={opt.id}
              onClick={() => toggle(opt.id)}
              role={isMulti ? "checkbox" : "radio"}
              aria-checked={sel}
              className="q-stagger"
              style={{
                ...stagger(i, 45),
                position: "relative",
                padding: "14px 18px 18px",
                backgroundColor: sel
                  ? question.accent
                  : "rgba(255,255,255,0.06)",
                border: `1.5px solid ${sel ? question.accent : "rgba(255,255,255,0.18)"}`,
                color: sel ? question.bg : "rgba(255,255,255,0.8)",
                fontSize: "12px",
                fontWeight: 700,
                letterSpacing: "0.14em",
                cursor: "pointer",
                transform: `rotate(${rot}deg)`,
                transition: "all 0.22s cubic-bezier(0.34, 1.56, 0.64, 1)",
                transformOrigin: "center center",
                whiteSpace: "nowrap",
                boxShadow: sel
                  ? "2px 3px 0 rgba(0,0,0,0.25)"
                  : "1px 2px 0 rgba(0,0,0,0.15)",
              }}
              onMouseEnter={(e) => {
                if (!sel)
                  e.currentTarget.style.transform = `rotate(${rot * 0.3}deg) translateY(-2px)`;
              }}
              onMouseLeave={(e) => {
                if (!sel) e.currentTarget.style.transform = `rotate(${rot}deg)`;
              }}
            >
              <div
                aria-hidden="true"
                style={{
                  position: "absolute",
                  top: "-6px",
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: "10px",
                  height: "10px",
                  borderRadius: "50%",
                  backgroundColor: sel ? question.bg : question.accent,
                  opacity: sel ? 0.5 : 0.35,
                  transition: "all 0.22s",
                }}
              />
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function getLayoutComponent(q: any) {
  switch (q.type) {
    case "image-grid":
      return LayoutImageGrid;
    case "palette-cards":
      return LayoutPaletteCards;
    case "binary-pairs":
      return LayoutBinaryPairs;
    case "sliders":
      return LayoutSliders;
    case "life-reality":
      return LayoutLifeReality;
    case "free-text":
      return LayoutFreeText;
    case "category-priority":
      return LayoutCategoryPriority;
    case "category-spend":
      return LayoutCategorySpend;
    case "budget-entry":
      return LayoutBudgetEntry;
    case "room-size":
      return LayoutRoomSize;
    case "openings":
      return LayoutOpenings;
    case "grouped-checklist":
      return LayoutGroupedChecklist;
    default:
      break;
  }
  switch (q.layout) {
    case "full-color-split":
      return LayoutFullColorSplit;
    case "ghost-type":
      return LayoutGhostType;
    case "scattered-chips":
      return LayoutScatteredChips;
    case "vertical-split":
      return LayoutVerticalSplit;
    case "offset-composition":
      return LayoutOffsetComposition;
    case "giant-type-small-options":
      return LayoutGiantTypeSmallOptions;
    case "two-column-grid":
      return LayoutTwoColumnGrid;
    case "hover-reactive":
      return LayoutHoverReactive;
    case "editorial-stack":
      return LayoutEditorialStack;
    case "full-bleed-statement":
      return LayoutFullBleedStatement;
    case "magazine-spread":
      return LayoutMagazineSpread;
    case "split-typewriter":
      return LayoutSplitTypewriter;
    case "pinboard":
      return LayoutPinboard;
    default:
      return LayoutHoverReactive;
  }
}
