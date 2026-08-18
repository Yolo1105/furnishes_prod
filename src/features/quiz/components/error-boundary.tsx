"use client";

import { Component, type ReactNode } from "react";
import { Icon } from "./shared";

type BoundaryProps = { children?: ReactNode };
type BoundaryState = { error: Error | null };

export class QuizErrorBoundary extends Component<BoundaryProps, BoundaryState> {
  constructor(props: BoundaryProps) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: Error): BoundaryState {
    return { error };
  }
  override render() {
    if (!this.state.error) return this.props.children;
    return (
      <div
        className="q-vh"
        style={{
          backgroundColor: "#1a1714",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "18px",
          padding: "28px",
          textAlign: "center",
        }}
      >
        <span
          style={{
            fontSize: "11px",
            letterSpacing: "0.26em",
            color: "#B33D0E",
            fontWeight: 700,
          }}
        >
          SOMETHING SLIPPED
        </span>
        <h1
          style={{
            fontSize: "clamp(26px, 5vw, 52px)",
            fontWeight: 700,
            color: "#DDD5C4",
            margin: 0,
          }}
        >
          THE QUIZ HIT A SNAG
        </h1>
        <p
          style={{
            fontSize: "12px",
            color: "rgba(221,213,196,0.5)",
            letterSpacing: "0.08em",
            maxWidth: "380px",
            lineHeight: 1.7,
          }}
        >
          Your saved progress is untouched. Reload to pick up where you left
          off.
        </p>
        <button
          onClick={() => this.setState({ error: null })}
          style={{
            backgroundColor: "#B33D0E",
            color: "#DDD5C4",
            border: "none",
            padding: "14px 34px",
            fontSize: "12px",
            letterSpacing: "0.2em",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          TRY AGAIN{" "}
          <Icon name="arrow-right" size={13} style={{ marginLeft: "6px" }} />
        </button>
      </div>
    );
  }
}
