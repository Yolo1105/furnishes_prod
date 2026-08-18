// @ts-nocheck

"use client";

import { useEffect } from "react";
import { FLOW_META_DEFS, QUIZ_PAD_X } from "@/features/quiz/data/constants";

export function FlowInterstitial({ flow, index, total, onDone }: any) {
  const meta = FLOW_META_DEFS[flow] ?? FLOW_META_DEFS.style;
  useEffect(() => {
    const id = setTimeout(onDone, 1500);
    return () => clearTimeout(id);
  }, [onDone]);

  return (
    <div
      onClick={onDone}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onDone();
        }
      }}
      tabIndex={0}
      role="button"
      aria-label={`Part ${index} of ${total}: ${meta.longLabel}. Click to continue.`}
      className="q-vh"
      style={{
        position: "relative",
        overflow: "hidden",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        className="q-interstitial-bg"
        style={{ position: "absolute", inset: 0, backgroundColor: "#1a1714" }}
      />
      <div
        style={{
          position: "relative",
          zIndex: 1,
          textAlign: "center",
          padding: `0 ${QUIZ_PAD_X}`,
        }}
      >
        <div
          className="q-reveal"
          style={{
            fontSize: "12px",
            letterSpacing: "0.3em",
            color: "#B33D0E",
            fontWeight: 700,
            marginBottom: "18px",
            animationDelay: "0.15s",
          }}
        >
          PART {String(index).padStart(2, "0")} /{" "}
          {String(total).padStart(2, "0")}
        </div>
        <div
          className="q-interstitial-title"
          style={{
            fontSize: "clamp(28px, 6vw, 64px)",
            fontWeight: 700,
            color: "#DDD5C4",
            lineHeight: 1.05,
          }}
        >
          {meta.longLabel}
        </div>
        <div
          className="q-reveal"
          style={{
            fontSize: "13px",
            letterSpacing: "0.12em",
            color: "rgba(221,213,196,0.4)",
            marginTop: "18px",
            animationDelay: "0.5s",
          }}
        >
          {meta.sub}
        </div>
        <div
          style={{
            fontSize: "10px",
            letterSpacing: "0.24em",
            color: "rgba(221,213,196,0.3)",
            fontWeight: 700,
            marginTop: "44px",
          }}
        >
          TAP ANYWHERE TO CONTINUE
        </div>
      </div>
    </div>
  );
}
