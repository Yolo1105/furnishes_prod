"use client";

import {
  StyleKey,
  STYLE_PROFILES,
  STYLE_QUESTIONS,
  AnswerValue,
  MultiAnswer,
  GroupedChecklistAnswer,
  QuizAppMode,
  BudgetEntryAnswer,
  CategoryPriorityAnswer,
  CategorySpendAnswer,
  BUDGET_CATEGORIES,
  BUDGET_PRIORITY_OPTIONS,
  BUDGET_SPEND_OPTIONS,
  BUDGET_STRICTNESS_OPTIONS,
} from "@/lib/quiz-data";

interface ResultsPageProps {
  mode?: QuizAppMode;
  styleKey: StyleKey;
  answers: Record<string, AnswerValue>;
  budgetRange?: [number, number] | null;
  onRetake: () => void;
}

function fmt(n: number) {
  return "$" + n.toLocaleString("en-US");
}

export function ResultsPage({
  mode = "full",
  styleKey,
  answers,
  budgetRange,
  onRetake,
}: ResultsPageProps) {
  const profile = STYLE_PROFILES[styleKey];

  const styleHighlights = STYLE_QUESTIONS.slice(0, 6)
    .map((q) => {
      const ans = answers[q.id];
      if (!ans) return null;
      let chosen = "";

      if (q.type === "single-select" && typeof ans === "string") {
        chosen = q.options?.find((o) => o.id === ans)?.label ?? "";
      } else if (q.type === "multi-select" && Array.isArray(ans)) {
        const labels = (ans as MultiAnswer)
          .map((id) => q.options?.find((o) => o.id === id)?.label ?? "")
          .filter(Boolean);
        chosen = labels.slice(0, 3).join(", ");
      } else if (q.type === "image-grid" && Array.isArray(ans)) {
        const labels = (ans as MultiAnswer)
          .map((id) => q.imageOptions?.find((o) => o.id === id)?.label ?? "")
          .filter(Boolean);
        chosen = labels.slice(0, 3).join(", ");
      } else if (q.type === "palette-cards" && typeof ans === "string") {
        chosen = q.paletteCards?.find((c) => c.id === ans)?.name ?? "";
      }

      if (!chosen) return null;
      return { question: q.question, answer: chosen };
    })
    .filter(Boolean) as { question: string; answer: string }[];

  const furniture = answers["r10"] as GroupedChecklistAnswer | undefined;

  const b1 = answers["b1"] as BudgetEntryAnswer | undefined;
  const statedBudget =
    b1?.path === "know" && b1.amount != null && b1.strictness
      ? {
          amount: b1.amount,
          strictness:
            BUDGET_STRICTNESS_OPTIONS.find((s) => s.id === b1.strictness)
              ?.label ?? b1.strictness,
        }
      : null;

  const priorities = answers["b3"] as CategoryPriorityAnswer | undefined;
  const spendByCat = answers["b4"] as CategorySpendAnswer | undefined;

  const priorityRows =
    priorities &&
    (BUDGET_CATEGORIES.map((c) => {
      const id = priorities[c.id];
      if (!id) return null;
      const label =
        BUDGET_PRIORITY_OPTIONS.find((o) => o.id === id)?.label ?? id;
      return { category: c.label, value: label };
    }).filter(Boolean) as { category: string; value: string }[]);

  const spendRows =
    spendByCat &&
    (BUDGET_CATEGORIES.map((c) => {
      const id = spendByCat[c.id];
      if (!id) return null;
      const label = BUDGET_SPEND_OPTIONS.find((o) => o.id === id)?.label ?? id;
      return { category: c.label, value: label };
    }).filter(Boolean) as { category: string; value: string }[]);

  if (mode === "budget") {
    return (
      <div
        className="quiz-enter"
        style={{
          minHeight: "100dvh",
          backgroundColor: "#1a1714",
          color: "#DDD5C4",
          display: "flex",
          flexDirection: "column",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          aria-hidden="true"
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
          BUDGET
        </div>

        <header
          style={{ padding: "24px 32px" }}
          className="flex items-center justify-between"
        >
          <span
            style={{
              fontSize: "10px",
              letterSpacing: "0.2em",
              color: "#B33D0E",
              fontWeight: 700,
            }}
          >
            YOUR BUDGET PLAN
          </span>
          <button
            onClick={onRetake}
            style={{
              fontSize: "10px",
              letterSpacing: "0.16em",
              color: "rgba(221,213,196,0.35)",
              background: "none",
              border: "none",
              cursor: "pointer",
              fontFamily: "inherit",
              fontWeight: 700,
              transition: "color 0.2s",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.color = "rgba(221,213,196,0.8)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.color = "rgba(221,213,196,0.35)")
            }
          >
            RETAKE →
          </button>
        </header>

        <main style={{ padding: "0 32px 48px", flex: 1 }}>
          <div style={{ marginBottom: "6px" }}>
            <span
              style={{
                fontSize: "11px",
                letterSpacing: "0.22em",
                color: "#B33D0E",
                fontWeight: 700,
              }}
            >
              SUMMARY
            </span>
          </div>
          <h1
            style={{
              fontSize: "clamp(28px, 6vw, 64px)",
              fontWeight: 700,
              letterSpacing: "-0.02em",
              lineHeight: 1.05,
              color: "#DDD5C4",
              marginBottom: "14px",
            }}
          >
            {statedBudget
              ? fmt(statedBudget.amount)
              : budgetRange
                ? `${fmt(budgetRange[0])} to ${fmt(budgetRange[1])}`
                : "YOUR PLAN"}
          </h1>
          <p
            style={{
              fontSize: "clamp(13px, 1.8vw, 16px)",
              letterSpacing: "0.06em",
              color: "#B33D0E",
              fontWeight: 700,
              marginBottom: "28px",
              maxWidth: "560px",
              lineHeight: 1.45,
            }}
          >
            {statedBudget
              ? statedBudget.strictness
              : budgetRange
                ? "Recommended range from your guided answers."
                : "Priorities and spend style below."}
          </p>

          <div
            style={{
              height: "1px",
              backgroundColor: "rgba(221,213,196,0.1)",
              maxWidth: "900px",
              marginBottom: "32px",
            }}
          />

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: "40px",
              maxWidth: "900px",
            }}
          >
            {priorityRows && priorityRows.length > 0 && (
              <div>
                <span
                  style={{
                    fontSize: "9px",
                    letterSpacing: "0.2em",
                    color: "rgba(221,213,196,0.3)",
                    fontWeight: 700,
                    display: "block",
                    marginBottom: "12px",
                  }}
                >
                  CATEGORY PRIORITIES
                </span>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                  }}
                >
                  {priorityRows.map((row) => (
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
                          fontSize: "9px",
                          letterSpacing: "0.12em",
                          color: "rgba(221,213,196,0.4)",
                          fontWeight: 700,
                        }}
                      >
                        {row.category}
                      </span>
                      <span
                        style={{
                          fontSize: "10px",
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
            )}

            {spendRows && spendRows.length > 0 && (
              <div>
                <span
                  style={{
                    fontSize: "9px",
                    letterSpacing: "0.2em",
                    color: "rgba(221,213,196,0.3)",
                    fontWeight: 700,
                    display: "block",
                    marginBottom: "12px",
                  }}
                >
                  WHERE TO SPEND & SAVE
                </span>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                  }}
                >
                  {spendRows.map((row) => (
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
                          fontSize: "9px",
                          letterSpacing: "0.12em",
                          color: "rgba(221,213,196,0.4)",
                          fontWeight: 700,
                        }}
                      >
                        {row.category}
                      </span>
                      <span
                        style={{
                          fontSize: "10px",
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
            )}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div
      className="quiz-enter"
      style={{
        minHeight: "100dvh",
        backgroundColor: "#1a1714",
        color: "#DDD5C4",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Ghost large profile name */}
      <div
        aria-hidden="true"
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
        {profile.name}
      </div>

      {/* Top bar */}
      <header
        style={{ padding: "24px 32px" }}
        className="flex items-center justify-between"
      >
        <span
          style={{
            fontSize: "10px",
            letterSpacing: "0.2em",
            color: "#B33D0E",
            fontWeight: 700,
          }}
        >
          YOUR STYLE PROFILE
        </span>
        <button
          onClick={onRetake}
          style={{
            fontSize: "10px",
            letterSpacing: "0.16em",
            color: "rgba(221,213,196,0.35)",
            background: "none",
            border: "none",
            cursor: "pointer",
            fontFamily: "inherit",
            fontWeight: 700,
            transition: "color 0.2s",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.color = "rgba(221,213,196,0.8)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.color = "rgba(221,213,196,0.35)")
          }
        >
          RETAKE →
        </button>
      </header>

      <main style={{ padding: "0 32px 48px", flex: 1 }}>
        {/* Profile headline */}
        <div style={{ marginBottom: "6px" }}>
          <span
            style={{
              fontSize: "11px",
              letterSpacing: "0.22em",
              color: "#B33D0E",
              fontWeight: 700,
            }}
          >
            YOU ARE
          </span>
        </div>
        <h1
          style={{
            fontSize: "clamp(36px, 8vw, 96px)",
            fontWeight: 700,
            letterSpacing: "-0.02em",
            lineHeight: 1,
            color: "#DDD5C4",
            marginBottom: "14px",
          }}
        >
          {profile.name}
        </h1>
        <p
          style={{
            fontSize: "clamp(14px, 2vw, 20px)",
            letterSpacing: "0.06em",
            color: "#B33D0E",
            fontWeight: 700,
            marginBottom: "28px",
            maxWidth: "560px",
            lineHeight: 1.4,
          }}
        >
          {profile.tagline}
        </p>

        <div
          style={{
            height: "1px",
            backgroundColor: "rgba(221,213,196,0.1)",
            maxWidth: "900px",
            marginBottom: "32px",
          }}
        />

        {/* Main grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: "40px",
            maxWidth: "900px",
          }}
        >
          {/* Style description + keywords */}
          <div>
            <span
              style={{
                fontSize: "9px",
                letterSpacing: "0.2em",
                color: "rgba(221,213,196,0.3)",
                fontWeight: 700,
                display: "block",
                marginBottom: "12px",
              }}
            >
              YOUR STYLE
            </span>
            <p
              style={{
                fontSize: "13px",
                lineHeight: 1.75,
                color: "rgba(221,213,196,0.65)",
                letterSpacing: "0.04em",
                marginBottom: "20px",
              }}
            >
              {profile.description}
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {profile.keywords.map((kw) => (
                <span
                  key={kw}
                  style={{
                    border: "1px solid rgba(221,213,196,0.18)",
                    padding: "6px 12px",
                    fontSize: "9px",
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

          {/* Palette + style highlights */}
          <div>
            <span
              style={{
                fontSize: "9px",
                letterSpacing: "0.2em",
                color: "rgba(221,213,196,0.3)",
                fontWeight: 700,
                display: "block",
                marginBottom: "10px",
              }}
            >
              YOUR PALETTE
            </span>
            <div style={{ display: "flex", gap: "6px", marginBottom: "24px" }}>
              {profile.palette.map((color) => (
                <div
                  key={color}
                  title={color}
                  style={{
                    width: "40px",
                    height: "40px",
                    backgroundColor: color,
                  }}
                />
              ))}
            </div>

            {styleHighlights.length > 0 && (
              <>
                <span
                  style={{
                    fontSize: "9px",
                    letterSpacing: "0.2em",
                    color: "rgba(221,213,196,0.3)",
                    fontWeight: 700,
                    display: "block",
                    marginBottom: "12px",
                  }}
                >
                  YOUR CHOICES
                </span>
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
                          fontSize: "9px",
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
                          fontSize: "11px",
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
              </>
            )}
          </div>

          {/* Budget section */}
          {budgetRange && (
            <div>
              <span
                style={{
                  fontSize: "9px",
                  letterSpacing: "0.2em",
                  color: "rgba(221,213,196,0.3)",
                  fontWeight: 700,
                  display: "block",
                  marginBottom: "12px",
                }}
              >
                YOUR BUDGET
              </span>
              <div
                style={{
                  border: "1.5px solid rgba(221,213,196,0.15)",
                  padding: "18px 20px",
                }}
              >
                <span
                  style={{
                    fontSize: "9px",
                    letterSpacing: "0.14em",
                    color: "rgba(221,213,196,0.35)",
                    fontWeight: 700,
                    display: "block",
                    marginBottom: "8px",
                  }}
                >
                  RECOMMENDED RANGE
                </span>
                <div
                  style={{
                    fontSize: "clamp(20px, 3.5vw, 36px)",
                    fontWeight: 700,
                    color: "#DDD5C4",
                    letterSpacing: "-0.02em",
                    lineHeight: 1,
                  }}
                >
                  {fmt(budgetRange[0])} to {fmt(budgetRange[1])}
                </div>
              </div>
            </div>
          )}

          {/* Room summary */}
          {furniture && furniture.length > 0 && (
            <div>
              <span
                style={{
                  fontSize: "9px",
                  letterSpacing: "0.2em",
                  color: "rgba(221,213,196,0.3)",
                  fontWeight: 700,
                  display: "block",
                  marginBottom: "12px",
                }}
              >
                FURNITURE LIST
              </span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {furniture.map((id) => {
                  const label = id
                    .replace("r10-", "")
                    .replace(/-/g, " ")
                    .toUpperCase();
                  return (
                    <span
                      key={id}
                      style={{
                        border: "1px solid rgba(221,213,196,0.15)",
                        padding: "5px 10px",
                        fontSize: "9px",
                        letterSpacing: "0.14em",
                        color: "rgba(221,213,196,0.45)",
                        fontWeight: 700,
                      }}
                    >
                      {label}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
