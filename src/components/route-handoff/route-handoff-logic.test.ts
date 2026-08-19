import { describe, expect, it } from "vitest";
import {
  CANVAS_HANDOFF_BG,
  LANDING_HANDOFF_BG,
  PEACH_HANDOFF_BG,
  QUIZ_HANDOFF_BG,
  handoffCoverColor,
  routePaintSelector,
  shouldHandoff,
} from "./route-handoff-logic";

describe("shouldHandoff", () => {
  it("covers every cross-surface URL change", () => {
    expect(shouldHandoff("/quiz", "/")).toBe(true);
    expect(shouldHandoff("/", "/quiz")).toBe(true);
    expect(shouldHandoff("/", "/login")).toBe(true);
    expect(shouldHandoff("/", "/contact")).toBe(true);
    expect(shouldHandoff("/quiz", "/login")).toBe(true);
    expect(shouldHandoff("/login", "/account")).toBe(true);
    expect(shouldHandoff("/terms", "/")).toBe(true);
    expect(shouldHandoff("/account", "/")).toBe(true);
    expect(shouldHandoff("/account/chat", "/account/canvas")).toBe(true);
  });

  it("leaves in-chrome motion to the nested shells", () => {
    expect(shouldHandoff("/login", "/signup")).toBe(false);
    expect(shouldHandoff("/account/chat", "/account/settings")).toBe(false);
    expect(shouldHandoff("/quiz", "/quiz")).toBe(false);
  });

  it("covers legal ↔ legal so the unstyled public swap does not flash", () => {
    expect(shouldHandoff("/terms", "/privacy-policy")).toBe(true);
  });
});

describe("routePaintSelector", () => {
  it("targets the destination path marker", () => {
    expect(routePaintSelector("/quiz")).toBe('[data-route-path="/quiz"]');
    expect(routePaintSelector("/")).toBe('[data-route-path="/"]');
  });
});

describe("handoffCoverColor", () => {
  it("keeps the origin color when arriving on landing", () => {
    expect(handoffCoverColor("/", "/quiz")).toBe(QUIZ_HANDOFF_BG);
    expect(handoffCoverColor("/", "/login")).toBe(PEACH_HANDOFF_BG);
  });

  it("matches the destination surface otherwise", () => {
    expect(handoffCoverColor("/")).toBe(LANDING_HANDOFF_BG);
    expect(handoffCoverColor("/quiz")).toBe(QUIZ_HANDOFF_BG);
    expect(handoffCoverColor("/login")).toBe(PEACH_HANDOFF_BG);
    expect(handoffCoverColor("/contact")).toBe(PEACH_HANDOFF_BG);
    expect(handoffCoverColor("/account")).toBe(PEACH_HANDOFF_BG);
    expect(handoffCoverColor("/account/canvas")).toBe(CANVAS_HANDOFF_BG);
  });
});
