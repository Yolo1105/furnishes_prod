"use client";

import type { CSSProperties } from "react";

export function OptionPill({
  label,
  selected,
  accent,
  bg,
  onClick,
  style,
}: {
  label: string;
  selected: boolean;
  accent: string;
  bg: string;
  onClick: () => void;
  style?: CSSProperties;
}) {
  return (
    <button
      onClick={onClick}
      role="radio"
      aria-checked={selected}
      style={{
        display: "inline-block",
        border: `1.5px solid ${selected ? accent : "rgba(255,255,255,0.3)"}`,
        color: selected ? bg : "rgba(255,255,255,0.85)",
        backgroundColor: selected ? accent : "transparent",
        padding: "10px 20px",
        fontSize: "11px",
        letterSpacing: "0.14em",
        fontWeight: 700,
        cursor: "pointer",
        transition: "all 0.2s",
        fontFamily: "inherit",
        ...style,
      }}
    >
      {label}
    </button>
  );
}

export function OptionBlock({
  label,
  sublabel,
  selected,
  accent,
  bg,
  onClick,
  style,
}: {
  label: string;
  sublabel?: string;
  selected: boolean;
  accent: string;
  bg: string;
  onClick: () => void;
  style?: CSSProperties;
}) {
  return (
    <button
      onClick={onClick}
      role="radio"
      aria-checked={selected}
      style={{
        display: "block",
        width: "100%",
        textAlign: "left",
        border: `1.5px solid ${selected ? accent : "rgba(255,255,255,0.2)"}`,
        color: selected ? bg : "rgba(255,255,255,0.85)",
        backgroundColor: selected ? accent : "transparent",
        padding: "16px 22px",
        fontSize: "12px",
        letterSpacing: "0.14em",
        fontWeight: 700,
        cursor: "pointer",
        transition: "all 0.2s",
        fontFamily: "inherit",
        ...style,
      }}
    >
      <span style={{ display: "block" }}>{label}</span>
      {sublabel && (
        <span
          style={{
            display: "block",
            fontSize: "10px",
            opacity: 0.6,
            letterSpacing: "0.1em",
            marginTop: "4px",
            fontWeight: 400,
          }}
        >
          {sublabel}
        </span>
      )}
    </button>
  );
}
