// @ts-nocheck

"use client";

import { useEffect, useRef, useState } from "react";
import { assembleQuizResultV1 } from "@/features/quiz/assemble-quiz-result";
import { rankTally } from "@/features/quiz/engine/scoring";
import { STYLE_PROFILES } from "@/features/quiz/data/style-profiles";
import { STYLE_QUESTIONS } from "@/features/quiz/data/style-questions";
import {
  BUDGET_CATEGORIES,
  BUDGET_PRIORITY_OPTIONS,
  BUDGET_SPEND_OPTIONS,
  BUDGET_STRICTNESS_OPTIONS,
} from "@/features/quiz/data/budget-questions";
import { QUIZ_PAD_X, stagger } from "./shared";
import {
  fmtUSD,
  ResultsShell,
  ResultsHeader,
  KVRows,
  useRevealStages,
  useTypewriter,
  lookupLabel,
  SectionNumber,
  StyleBreakdownBars,
  FadeIn,
  ResultLabel,
} from "./results-helpers";

export function ResultsPage({
  mode = "full",
  tally,
  answers,
  budgetRange,
  onRetake,
  onEdit,
}: any) {
  const ranked = rankTally(tally);
  const styleKey = ranked[0].key;
  const profile = STYLE_PROFILES[styleKey];
  const secondary =
    ranked[1] && ranked[1].score > 0 ? STYLE_PROFILES[ranked[1].key] : null;

  useEffect(() => {
    const result = assembleQuizResultV1({ mode, tally, answers, budgetRange });
    window.dispatchEvent(
      new CustomEvent("furnishes:quiz-complete", { detail: result }),
    );
  }, [mode, tally, answers, budgetRange]);

  /* Reveal choreography: 0 wipe · 1 name typing · 2 tagline+palette · 3 bars · 4 everything */
  const [stage, skipAll] = useRevealStages(4, [350, 1200, 700, 700]);
  const headlineName =
    mode === "budget"
      ? "YOUR PLAN"
      : mode === "room"
        ? "THE BRIEF"
        : profile.name;
  const typedName = useTypewriter(headlineName, stage >= 1 && stage < 4);
  const shownName = stage >= 1 ? (stage >= 4 ? headlineName : typedName) : "";

  /* ── shared answer digests ── */
  const b1 = answers["b1"];
  const statedBudget =
    b1?.path === "know" && b1.amount != null && b1.strictness
      ? {
          amount: b1.amount,
          strictness:
            BUDGET_STRICTNESS_OPTIONS.find((s) => s.id === b1.strictness)
              ?.label ?? b1.strictness,
        }
      : null;

  const priorities = answers["b3"];
  const spendByCat = answers["b4"];
  const priorityRows = priorities
    ? BUDGET_CATEGORIES.map((c) => {
        const id = priorities[c.id];
        if (!id) return null;
        return {
          category: c.label,
          value: BUDGET_PRIORITY_OPTIONS.find((o) => o.id === id)?.label ?? id,
        };
      }).filter(Boolean)
    : null;
  const spendRows = spendByCat
    ? BUDGET_CATEGORIES.map((c) => {
        const id = spendByCat[c.id];
        if (!id) return null;
        return {
          category: c.label,
          value: BUDGET_SPEND_OPTIONS.find((o) => o.id === id)?.label ?? id,
        };
      }).filter(Boolean)
    : null;

  const roomSize = answers["r4"];
  const sqft =
    roomSize?.width && roomSize?.length
      ? roomSize.width * roomSize.length
      : null;
  const roomRows = [
    { category: "HOUSEHOLD", value: lookupLabel("r1", answers["r1"]) },
    { category: "PETS", value: lookupLabel("r2", answers["r2"]) },
    { category: "OWNERSHIP", value: lookupLabel("r3", answers["r3"]) },
    {
      category: "ROOM SIZE",
      value: roomSize
        ? roomSize.width && roomSize.length
          ? `${roomSize.width} × ${roomSize.length} FT · ${sqft} SQ FT`
          : (lookupLabel("r4", roomSize.preset) ?? null)
        : null,
    },
    { category: "LIGHT", value: lookupLabel("r5", answers["r5"]) },
    {
      category: "OPENINGS",
      value:
        Array.isArray(answers["r6"]) && answers["r6"].length > 0
          ? `${answers["r6"].length} PLACED`
          : null,
    },
    { category: "FLOORING", value: lookupLabel("r8", answers["r8"]) },
  ].filter((r) => r.value);

  const furniture = answers["r10"];

  const styleHighlights = STYLE_QUESTIONS.slice(0, 6)
    .map((q) => {
      const ans = answers[q.id];
      if (!ans) return null;
      let chosen = "";
      if (q.type === "single-select" && typeof ans === "string") {
        chosen = q.options?.find((o) => o.id === ans)?.label ?? "";
      } else if (q.type === "multi-select" && Array.isArray(ans)) {
        chosen = ans
          .map((id) => q.options?.find((o) => o.id === id)?.label ?? "")
          .filter(Boolean)
          .slice(0, 3)
          .join(", ");
      } else if (q.type === "image-grid" && Array.isArray(ans)) {
        chosen = ans
          .map((id) => q.imageOptions?.find((o) => o.id === id)?.label ?? "")
          .filter(Boolean)
          .slice(0, 3)
          .join(", ");
      } else if (q.type === "image-grid" && typeof ans === "string") {
        chosen = q.imageOptions?.find((o) => o.id === ans)?.label ?? "";
      } else if (q.type === "palette-cards" && typeof ans === "string") {
        chosen = q.paletteCards?.find((c) => c.id === ans)?.name ?? "";
      }
      if (!chosen) return null;
      return { question: q.question, answer: chosen };
    })
    .filter(Boolean);

  const hasStyle = mode === "full" || mode === "style";
  const hasBudget =
    (mode === "full" || mode === "budget") &&
    (statedBudget || budgetRange || priorityRows || spendRows);
  const hasRoom =
    (mode === "full" || mode === "room") &&
    (roomRows.length > 0 || (furniture && furniture.length > 0));
  const sectionCount = [hasStyle, hasBudget, hasRoom].filter(Boolean).length;
  let sectionNo = 0;
  const nextNo = () => String(++sectionNo).padStart(2, "0");

  /* ── COPY BRIEF — a portable plain-text version of every conclusion ── */
  const [copyState, setCopyState] = useState("idle");
  const copyTimer = useRef(null);
  useEffect(() => () => clearTimeout(copyTimer.current), []);
  const buildBriefText = () => {
    const L = [];
    L.push("FURNISHES — DESIGN BRIEF");
    L.push("=".repeat(28));
    if (hasStyle) {
      L.push("", "STYLE — THE VERDICT", "-".repeat(20));
      L.push(`Profile: ${profile.name} — ${profile.tagline}`);
      if (secondary) L.push(`Secondary streak: ${secondary.name}`);
      L.push(
        "Breakdown: " +
          ranked
            .map((r) => `${STYLE_PROFILES[r.key].name} ${r.pct}%`)
            .join(" · "),
      );
      L.push(`Keywords: ${profile.keywords.join(", ")}`);
      L.push(`Palette: ${profile.palette.join("  ")}`);
    }
    if (hasBudget) {
      L.push("", "BUDGET — THE NUMBER", "-".repeat(20));
      if (statedBudget)
        L.push(
          `Stated budget: ${fmtUSD(statedBudget.amount)} (${statedBudget.strictness})`,
        );
      else if (budgetRange)
        L.push(
          `Recommended range: ${fmtUSD(budgetRange[0])} – ${fmtUSD(budgetRange[1])}`,
        );
      if (priorityRows && priorityRows.length)
        L.push(
          "Priorities: " +
            priorityRows.map((r) => `${r.category}: ${r.value}`).join(" · "),
        );
      if (spendRows && spendRows.length)
        L.push(
          "Spend/save: " +
            spendRows.map((r) => `${r.category}: ${r.value}`).join(" · "),
        );
    }
    if (hasRoom) {
      L.push("", "ROOM — THE BRIEF", "-".repeat(20));
      roomRows.forEach((r) => L.push(`${r.category}: ${r.value}`));
      if (furniture && furniture.length)
        L.push(
          "Furniture list: " +
            furniture
              .map((id) =>
                id.replace("r10-", "").replace(/-/g, " ").toUpperCase(),
              )
              .join(", "),
        );
    }
    return L.join("\n");
  };
  const handleCopy = () => {
    const text = buildBriefText();
    const done = (state) => {
      setCopyState(state);
      clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopyState("idle"), 2200);
    };
    const fallback = () => {
      try {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        const ok = document.execCommand("copy");
        document.body.removeChild(ta);
        done(ok ? "copied" : "failed");
      } catch {
        done("failed");
      }
    };
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(() => done("copied"), fallback);
    } else {
      fallback();
    }
  };

  const headline =
    mode === "budget"
      ? statedBudget
        ? fmtUSD(statedBudget.amount)
        : budgetRange
          ? `${fmtUSD(budgetRange[0])} – ${fmtUSD(budgetRange[1])}`
          : "YOUR PLAN"
      : shownName;

  useEffect(() => {
    if (stage >= 4) return;
    const onKey = (e) => {
      if (e.key === "Enter" || e.key === " " || e.key === "Escape") {
        e.preventDefault();
        skipAll();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [stage]);

  return (
    <div onClick={stage < 4 ? skipAll : undefined}>
      <ResultsShell
        ghostWord={
          mode === "budget" ? "BUDGET" : mode === "room" ? "ROOM" : profile.name
        }
      >
        <ResultsHeader
          label={
            sectionCount > 1
              ? "YOUR RESULTS — ALL FLOWS"
              : mode === "budget"
                ? "YOUR BUDGET PLAN"
                : mode === "room"
                  ? "YOUR ROOM BRIEF"
                  : "YOUR STYLE PROFILE"
          }
          onRetake={onRetake}
          onEdit={onEdit ? () => onEdit(null) : undefined}
          ready={stage >= 4}
          onCopy={handleCopy}
          copyState={copyState}
        />
        <main
          style={{
            padding: `0 ${QUIZ_PAD_X} 48px`,
            flex: 1,
            position: "relative",
            zIndex: 1,
          }}
        >
          {/* ── Headline reveal ── */}
          <div style={{ marginBottom: "6px", minHeight: "16px" }}>
            {stage >= 1 && (
              <span
                className="q-reveal"
                style={{
                  fontSize: "13px",
                  letterSpacing: "0.22em",
                  color: "#B33D0E",
                  fontWeight: 700,
                }}
              >
                {mode === "budget"
                  ? "THE NUMBER"
                  : mode === "room"
                    ? "YOUR SPACE, ON PAPER"
                    : "YOU ARE"}
              </span>
            )}
          </div>
          <h1
            style={{
              fontSize: "clamp(34px, 8vw, 92px)",
              fontWeight: 700,
              letterSpacing: "-0.02em",
              lineHeight: 1,
              color: "#DDD5C4",
              marginBottom: "14px",
              minHeight: "1em",
            }}
          >
            {mode === "budget" ? (stage >= 1 ? headline : "") : shownName}
            {stage >= 1 && stage < 4 && (
              <span
                aria-hidden="true"
                style={{
                  display: "inline-block",
                  width: "0.08em",
                  height: "0.8em",
                  backgroundColor: "#B33D0E",
                  marginLeft: "0.06em",
                  verticalAlign: "baseline",
                }}
              />
            )}
          </h1>
          {stage >= 2 && (
            <FadeIn>
              <p
                style={{
                  fontSize: "clamp(14px, 2vw, 20px)",
                  letterSpacing: "0.06em",
                  color: "#B33D0E",
                  fontWeight: 700,
                  marginBottom: "10px",
                  maxWidth: "560px",
                  lineHeight: 1.4,
                }}
              >
                {mode === "budget"
                  ? statedBudget
                    ? statedBudget.strictness
                    : "Recommended range from your guided answers."
                  : mode === "room"
                    ? "Everything a planner needs to start on your space."
                    : profile.tagline}
              </p>
            </FadeIn>
          )}
          {stage >= 3 && hasStyle && secondary && (
            <p
              className="q-reveal"
              style={{
                fontSize: "12px",
                letterSpacing: "0.18em",
                color: "rgba(221,213,196,0.45)",
                fontWeight: 700,
                marginBottom: "8px",
              }}
            >
              WITH A STREAK OF {secondary.name}
            </p>
          )}
          {stage >= 2 && hasStyle && (
            <div style={{ display: "flex", gap: "6px", marginBottom: "26px" }}>
              {profile.palette.map((color, i) => (
                <div
                  key={color}
                  className="q-stamp"
                  title={color}
                  style={{
                    width: "40px",
                    height: "40px",
                    backgroundColor: color,
                    ...stagger(i, 140),
                  }}
                />
              ))}
            </div>
          )}
          {stage < 4 && (
            <p
              style={{
                fontSize: "11px",
                letterSpacing: "0.2em",
                color: "rgba(221,213,196,0.25)",
                fontWeight: 700,
              }}
            >
              CLICK ANYWHERE TO SKIP
            </p>
          )}

          {/* ── Numbered per-flow conclusions ── */}
          {stage >= 3 && (
            <div
              style={{
                marginTop: "34px",
                display: "flex",
                flexDirection: "column",
                gap: "44px",
                maxWidth: "920px",
              }}
            >
              {hasStyle && (
                <section>
                  <FadeIn>
                    <SectionNumber
                      n={nextNo()}
                      label="STYLE — THE VERDICT"
                      onRevisit={onEdit ? () => onEdit("style") : undefined}
                    />
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "repeat(auto-fill, minmax(280px, 1fr))",
                        gap: "36px",
                      }}
                    >
                      <div>
                        <ResultLabel>HOW YOUR ANSWERS SPLIT</ResultLabel>
                        <StyleBreakdownBars
                          ranked={ranked}
                          animate={stage >= 3}
                        />
                      </div>
                      <div>
                        <ResultLabel>WHAT IT MEANS</ResultLabel>
                        <p
                          style={{
                            fontSize: "13px",
                            lineHeight: 1.75,
                            color: "rgba(221,213,196,0.65)",
                            letterSpacing: "0.04em",
                            marginBottom: "16px",
                          }}
                        >
                          {profile.description}
                        </p>
                        <div
                          style={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: "8px",
                          }}
                        >
                          {profile.keywords.map((kw) => (
                            <span
                              key={kw}
                              style={{
                                border: "1px solid rgba(221,213,196,0.18)",
                                padding: "6px 12px",
                                fontSize: "11px",
                                letterSpacing: "0.18em",
                                color: "rgba(221,213,196,0.5)",
                                fontWeight: 700,
                              }}
                            >
                              {kw}
                            </span>
                          ))}
                        </div>
                      </div>
                      {stage >= 4 && styleHighlights.length > 0 && (
                        <div className="q-reveal">
                          <ResultLabel>THE CHOICES THAT DECIDED IT</ResultLabel>
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: "12px",
                            }}
                          >
                            {styleHighlights.map((item, i) => (
                              <div key={i}>
                                <div
                                  style={{
                                    fontSize: "11px",
                                    color: "rgba(221,213,196,0.28)",
                                    letterSpacing: "0.1em",
                                    marginBottom: "2px",
                                    lineHeight: 1.4,
                                  }}
                                >
                                  {item.question}
                                </div>
                                <div
                                  style={{
                                    fontSize: "13px",
                                    color: "#B33D0E",
                                    letterSpacing: "0.12em",
                                    fontWeight: 700,
                                  }}
                                >
                                  {item.answer}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </FadeIn>
                </section>
              )}

              {hasBudget && stage >= 4 && (
                <section>
                  <FadeIn delay={120}>
                    <SectionNumber
                      n={nextNo()}
                      label="BUDGET — THE NUMBER"
                      onRevisit={onEdit ? () => onEdit("budget") : undefined}
                    />
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "repeat(auto-fill, minmax(280px, 1fr))",
                        gap: "36px",
                      }}
                    >
                      <div>
                        <ResultLabel>
                          {statedBudget
                            ? "YOUR STATED BUDGET"
                            : "RECOMMENDED RANGE"}
                        </ResultLabel>
                        <div
                          className="q-display"
                          style={{
                            fontSize: "clamp(24px, 4vw, 44px)",
                            fontWeight: 700,
                            color: "#DDD5C4",
                            letterSpacing: "-0.02em",
                            lineHeight: 1,
                            marginBottom: "8px",
                          }}
                        >
                          {statedBudget
                            ? fmtUSD(statedBudget.amount)
                            : budgetRange
                              ? `${fmtUSD(budgetRange[0])} – ${fmtUSD(budgetRange[1])}`
                              : "SET BY PRIORITIES"}
                        </div>
                        {statedBudget && (
                          <p
                            style={{
                              fontSize: "12px",
                              letterSpacing: "0.14em",
                              color: "#B33D0E",
                              fontWeight: 700,
                            }}
                          >
                            {statedBudget.strictness}
                          </p>
                        )}
                        {!statedBudget && budgetRange && (
                          <p
                            style={{
                              fontSize: "12px",
                              letterSpacing: "0.1em",
                              color: "rgba(221,213,196,0.4)",
                            }}
                          >
                            From your room, quality, timeline, and shopping
                            answers.
                          </p>
                        )}
                      </div>
                      {priorityRows && priorityRows.length > 0 && (
                        <KVRows
                          title="CATEGORY PRIORITIES"
                          rows={priorityRows}
                        />
                      )}
                      {spendRows && spendRows.length > 0 && (
                        <KVRows
                          title="WHERE TO SPEND & SAVE"
                          rows={spendRows}
                        />
                      )}
                    </div>
                  </FadeIn>
                </section>
              )}

              {hasRoom && stage >= 4 && (
                <section>
                  <FadeIn delay={240}>
                    <SectionNumber
                      n={nextNo()}
                      label="ROOM — THE BRIEF"
                      onRevisit={onEdit ? () => onEdit("room") : undefined}
                    />
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "repeat(auto-fill, minmax(280px, 1fr))",
                        gap: "36px",
                      }}
                    >
                      {roomRows.length > 0 && (
                        <KVRows title="YOUR SPACE" rows={roomRows} />
                      )}
                      {furniture && furniture.length > 0 && (
                        <div>
                          <ResultLabel>
                            FURNITURE LIST ({furniture.length})
                          </ResultLabel>
                          <div
                            style={{
                              display: "flex",
                              flexWrap: "wrap",
                              gap: "6px",
                            }}
                          >
                            {furniture.map((id, i) => (
                              <span
                                key={id}
                                className="q-stamp"
                                style={{
                                  border: "1px solid rgba(221,213,196,0.15)",
                                  padding: "5px 10px",
                                  fontSize: "11px",
                                  letterSpacing: "0.14em",
                                  color: "rgba(221,213,196,0.45)",
                                  fontWeight: 700,
                                  ...stagger(i, 50),
                                }}
                              >
                                {id
                                  .replace("r10-", "")
                                  .replace(/-/g, " ")
                                  .toUpperCase()}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </FadeIn>
                </section>
              )}
            </div>
          )}
        </main>
      </ResultsShell>
    </div>
  );
}
