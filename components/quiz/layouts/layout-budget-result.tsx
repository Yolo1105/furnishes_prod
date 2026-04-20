"use client";

export function LayoutBudgetResult({
  range,
  accent,
  bg,
}: {
  range: [number, number];
  accent: string;
  bg: string;
}) {
  const fmt = (n: number) => "$" + n.toLocaleString("en-US");

  return (
    <div
      style={{
        padding: "20px 28px",
        border: `1.5px solid ${accent}`,
        maxWidth: "400px",
        backgroundColor: bg,
      }}
    >
      <span
        style={{
          fontSize: "9px",
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
          fontSize: "10px",
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

// ─── NEW: Room Size ───────────────────────────────────────────────────────────
