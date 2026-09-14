import { describe, expect, it } from "vitest";
import {
  CANVAS_HANDOFF_BG,
  LANDING_HANDOFF_BG,
  PEACH_HANDOFF_BG,
  QUIZ_HANDOFF_BG,
  LANDING_PAINTED_SELECTORS,
  clearAuthScrollLock,
  clearQuizDocumentLock,
  handoffCoverColor,
  isAuthPath,
  isQuizPath,
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

describe("isAuthPath", () => {
  it("marks login and signup as auth surfaces", () => {
    expect(isAuthPath("/login")).toBe(true);
    expect(isAuthPath("/signup")).toBe(true);
    expect(isAuthPath("/")).toBe(false);
  });
});

describe("clearAuthScrollLock", () => {
  it("is exported for leaving auth chrome", () => {
    expect(typeof clearAuthScrollLock).toBe("function");
  });
});

describe("quiz document lock", () => {
  it("marks the public quiz as its own surface", () => {
    expect(isQuizPath("/quiz")).toBe(true);
    expect(isQuizPath("/quiz/extra")).toBe(true);
    expect(isQuizPath("/account/quiz")).toBe(false);
    expect(isQuizPath("/")).toBe(false);
  });

  it("is exported so leaving /quiz can restore document overflow", () => {
    expect(typeof clearQuizDocumentLock).toBe("function");
  });
});

describe("routePaintSelector", () => {
  it("targets the destination path marker", () => {
    expect(routePaintSelector("/quiz")).toBe('[data-route-path="/quiz"]');
    expect(routePaintSelector("/")).toBe('[data-route-path="/"]');
  });
});

describe("LANDING_PAINTED_SELECTORS", () => {
  it("treats the landing root as painted before WebGL reports ready", () => {
    expect(LANDING_PAINTED_SELECTORS).toContain("[data-landing-root]");
    expect(LANDING_PAINTED_SELECTORS).toContain("#landing-hero-scene");
    expect(LANDING_PAINTED_SELECTORS).toContain(
      '[aria-label="Loading Furnishes"]',
    );
  });

  it("does not wait for freeze or placeholder to lift the cover", () => {
    expect(LANDING_PAINTED_SELECTORS.join(" ")).not.toContain(
      "furnishes-landing-freeze-style",
    );
    expect(LANDING_PAINTED_SELECTORS.join(" ")).not.toContain(
      "data-hero-placeholder-ready",
    );
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
