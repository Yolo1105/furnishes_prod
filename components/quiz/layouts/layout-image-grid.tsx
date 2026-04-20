"use client";

import Image from "next/image";
import { MultiAnswer } from "@/lib/quiz-data";
import { STYLE_EXPLORER_IMAGE_POOL } from "@/lib/quiz-data/style-explorer-image-pool";
import type { LayoutProps } from "./types";

export function LayoutImageGrid({ question, answer, onAnswer }: LayoutProps) {
  const imgOpts = question.imageOptions ?? [];
  let fallbackIdx = 0;
  const isMulti =
    (question.minSelect ?? 1) > 1 || (question.maxSelect ?? 1) > 1;
  const selected = isMulti ? ((answer as MultiAnswer) ?? []) : null;

  const toggle = (id: string) => {
    if (isMulti) {
      const cur = (answer as MultiAnswer) ?? [];
      const max = question.maxSelect ?? 99;
      if (cur.includes(id)) {
        onAnswer(cur.filter((x) => x !== id));
      } else if (cur.length < max) {
        onAnswer([...cur, id]);
      }
    } else {
      onAnswer(id);
    }
  };

  return (
    <div
      className="flex flex-1 flex-col"
      style={{ padding: "20px 28px 0" }}
      role="group"
      aria-labelledby="q-text"
    >
      <h1
        id="q-text"
        style={{
          color: question.accent,
          fontSize: "clamp(18px, 3vw, 32px)",
          fontWeight: 700,
          letterSpacing: "0.08em",
          lineHeight: 1.1,
          marginBottom: question.subtext ? "6px" : "20px",
        }}
      >
        {question.question}
      </h1>
      {question.subtext && (
        <p
          style={{
            color: question.accent,
            opacity: 0.55,
            fontSize: "11px",
            letterSpacing: "0.1em",
            marginBottom: "20px",
          }}
        >
          {question.subtext}
        </p>
      )}
      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            imgOpts.length === 4 ? "1fr 1fr" : "repeat(3, 1fr)",
          gap: "8px",
          flex: 1,
        }}
      >
        {imgOpts.map((opt, imgIndex) => {
          const sel = isMulti
            ? (selected as string[]).includes(opt.id)
            : answer === opt.id;
          const imgUrl =
            opt.imageSrc ??
            STYLE_EXPLORER_IMAGE_POOL[
              fallbackIdx++ % STYLE_EXPLORER_IMAGE_POOL.length
            ];
          return (
            <button
              key={opt.id}
              onClick={() => toggle(opt.id)}
              role="checkbox"
              aria-checked={sel}
              style={{
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
              <Image
                src={imgUrl}
                alt={opt.label}
                width={600}
                height={400}
                priority={imgIndex === 0}
                unoptimized={imgUrl.endsWith(".svg")}
                className="block h-full min-h-[120px] w-full object-cover transition-[filter] duration-200"
                style={{
                  filter: sel ? "brightness(0.75)" : "brightness(0.6)",
                }}
              />
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
                    fontSize: "10px",
                    fontWeight: 700,
                    letterSpacing: "0.14em",
                    color: sel ? question.accent : "#fff",
                    display: "block",
                    transition: "color 0.2s",
                  }}
                >
                  {opt.label}
                </span>
                {opt.sublabel && (
                  <span
                    style={{
                      fontSize: "9px",
                      color: "rgba(255,255,255,0.65)",
                      letterSpacing: "0.06em",
                      display: "block",
                      marginTop: "3px",
                      lineHeight: 1.4,
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

// ─── NEW: Palette Cards ───────────────────────────────────────────────────────
