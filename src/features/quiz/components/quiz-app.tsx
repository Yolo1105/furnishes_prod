// @ts-nocheck
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useInjectQuizCss } from "./shared";
import { FLOW_META_DEFS } from "@/features/quiz/data/constants";
import { getLayoutComponent, paletteTheme } from "./layouts";
import { QuizShell } from "./quiz-shell";
import { FlowInterstitial } from "./flow-interstitial";
import { ResultsPage } from "./results-page";
import { IntroPage } from "./intro-page";
import {
  buildQuestionSequence,
  isAnswerComplete,
} from "@/features/quiz/engine/sequence";
import {
  calculateTally,
  computeBudgetRange,
} from "@/features/quiz/engine/scoring";

export function FurnishesDesignQuizInner() {
  useInjectQuizCss();
  const [mode, setMode] = useState("full");
  const [screen, setScreen] = useState("intro");
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const raw = params.get("mode");
    if (
      raw === "style" ||
      raw === "budget" ||
      raw === "room" ||
      raw === "full"
    ) {
      setMode(raw);
    }
    if (params.get("start") === "1") {
      setScreen("quiz");
    }
  }, []);
  const [answers, setAnswers] = useState({});
  const [currentIdx, setCurrentIdx] = useState(0);
  const [animKey, setAnimKey] = useState(0);
  const [exiting, setExiting] = useState(false);
  /* SMOOTH TRANSITIONS, ENV-PROOF — every page change fades out, swaps, and
     fades back in using inline-style CSS *transitions* (not keyframes), so it
     works even where stylesheets are sanitized or reduce-motion disables
     animations. The incoming screen stays visible; we no longer flash it to
     opacity 0 after the swap (that left a blank page if rAF never ran). */
  const [entered, setEntered] = useState(true);
  const fadeBusy = useRef(false);
  const fadeTimers = useRef([]);
  useEffect(() => () => fadeTimers.current.forEach(clearTimeout), []);
  const [fadeScope, setFadeScope] = useState("page"); // "page" fades everything; "content" fades only the question area
  const fadeSwap = useCallback((swap, scope = "page") => {
    if (fadeBusy.current) return;
    fadeBusy.current = true;
    fadeTimers.current = []; /* previous timers have fired; drop their ids */
    setFadeScope(scope);
    setExiting(true);
    /* failsafe: never let a lost frame deadlock navigation */
    fadeTimers.current.push(setTimeout(() => (fadeBusy.current = false), 1400));
    fadeTimers.current.push(
      setTimeout(() => {
        swap();
        setEntered(true);
        setExiting(false);
        fadeBusy.current = false;
      }, 300),
    );
  }, []);
  /* INTERACTIVE UPGRADE: page-wide theme override (palette immersion) */
  const [themeOverride, setThemeOverride] = useState(null);
  /* CLARITY UPGRADE: interstitial splash announcing the next flow */
  const [interstitial, setInterstitial] = useState(null); // flow key | null

  /* ── RESUME — progress persists across reloads via window.storage.
     Fully optional: every call is guarded, and the quiz behaves identically
     when the API is missing or failing. ── */
  const storageRef = useRef(
    typeof window !== "undefined" && window.storage ? window.storage : null,
  );
  const [savedGame, setSavedGame] = useState(null);
  useEffect(() => {
    const s = storageRef.current;
    if (!s) return;
    let alive = true;
    (async () => {
      try {
        const r = await s.get("furnishes-quiz-save");
        if (!alive || !r || !r.value) return;
        const d = JSON.parse(r.value);
        /* discard saves from incompatible future/past schemas silently */
        if (
          d &&
          d.v === 1 &&
          d.mode &&
          d.answers &&
          typeof d.answers === "object"
        )
          setSavedGame(d);
      } catch {
        /* no save / storage unavailable — fresh start */
      }
    })();
    return () => {
      alive = false;
    };
  }, []);
  const saveTimer = useRef(null);
  useEffect(() => {
    const s = storageRef.current;
    if (!s || screen !== "quiz") return;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      s.set(
        "furnishes-quiz-save",
        JSON.stringify({
          v: 1,
          mode,
          answers,
          currentIdx,
          savedAt: Date.now(),
        }),
      ).catch(() => {});
    }, 600);
    return () => clearTimeout(saveTimer.current);
  }, [answers, currentIdx, mode, screen]);
  const clearSave = useCallback(() => {
    setSavedGame(null);
    const s = storageRef.current;
    if (s) s.delete("furnishes-quiz-save").catch(() => {});
  }, []);

  const budgetAnswer = answers["b1"];
  const budgetPath = budgetAnswer?.path ?? null;
  const questions = buildQuestionSequence(
    mode,
    budgetPath === "guided" ? "guided" : budgetPath,
  );

  /* FIX #3: clamp the index — switching the b1 path from "guided" back to
     "know" shrinks `questions` while currentIdx may point past the end. */
  const safeIdx = Math.min(currentIdx, Math.max(0, questions.length - 1));
  const rawQuestion = questions[safeIdx];
  /* merge live theme override (palette immersion) into the question */
  const question = rawQuestion
    ? themeOverride
      ? { ...rawQuestion, bg: themeOverride.bg, accent: themeOverride.accent }
      : rawQuestion
    : rawQuestion;
  const answer = question ? (answers[question.id] ?? null) : null;
  const canProceed = question ? isAnswerComplete(question, answer) : false;

  /* ── per-flow progress metadata for the shell stepper ── */
  const flowsInOrder = [];
  questions.forEach((q) => {
    if (!flowsInOrder.includes(q.flow)) flowsInOrder.push(q.flow);
  });
  const flowMeta = flowsInOrder.map((flowKey) => {
    const idxs = questions
      .map((q, i) => (q.flow === flowKey ? i : -1))
      .filter((i) => i >= 0);
    const last = idxs[idxs.length - 1];
    const active = rawQuestion?.flow === flowKey;
    return {
      key: flowKey,
      label: FLOW_META_DEFS[flowKey].label,
      longLabel: FLOW_META_DEFS[flowKey].longLabel,
      total: idxs.length,
      current: active ? idxs.indexOf(safeIdx) + 1 : 0,
      active,
      done: safeIdx > last,
    };
  });

  const handleAnswer = useCallback(
    (value) => {
      if (!rawQuestion) return;
      setAnswers((prev) => ({ ...prev, [rawQuestion.id]: value }));
    },
    [rawQuestion],
  );

  const advance = useCallback(() => {
    const multiFlow = new Set(questions.map((q) => q.flow)).size > 1;
    const isLast = safeIdx >= questions.length - 1;
    const crossesFlow =
      !isLast &&
      multiFlow &&
      questions[safeIdx + 1].flow !== questions[safeIdx].flow;
    fadeSwap(
      () => {
        if (!isLast) {
          if (crossesFlow) setInterstitial(questions[safeIdx + 1].flow);
          setCurrentIdx(safeIdx + 1);
        } else {
          setScreen("results");
          clearSave();
        }
        setThemeOverride(null);
        setAnimKey((k) => k + 1);
      },
      /* plain question steps fade only the content; screen changes fade the page */
      isLast || crossesFlow ? "page" : "content",
    );
  }, [fadeSwap, safeIdx, questions, clearSave]);

  const goBack = useCallback(() => {
    fadeSwap(
      () => {
        if (safeIdx === 0) {
          setScreen("intro");
        } else {
          setCurrentIdx(safeIdx - 1);
        }
        setThemeOverride(null);
        setAnimKey((k) => k + 1);
      },
      safeIdx === 0 ? "page" : "content",
    );
  }, [fadeSwap, safeIdx]);

  /* A11Y: after each question change, move focus to the new heading so
     assistive tech announces the page turn (no scroll jump). */
  useEffect(() => {
    if (screen !== "quiz" || interstitial) return;
    const id = setTimeout(() => {
      if (typeof document === "undefined") return;
      const h = document.querySelector(".style-explorer-root main h1");
      if (h) {
        h.setAttribute("tabindex", "-1");
        h.focus({ preventScroll: true });
      }
    }, 380); /* after the entrance settles */
    return () => clearTimeout(id);
  }, [animKey, screen, interstitial]);

  /* ── INTERACTIVE UPGRADE: keyboard layer ──
     1-9 select/toggle options · ←/→ answer quick-fire pairs ·
     Enter next · Esc back. Ignored while typing in inputs. */
  useEffect(() => {
    if (screen !== "quiz") return;
    const onKey = (e) => {
      const tag = e.target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (interstitial) {
        if (e.key === "Enter" || e.key === " ") setInterstitial(null);
        return;
      }
      if (!rawQuestion) return;

      if (e.key === "Enter" && canProceed) {
        e.preventDefault();
        advance();
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        goBack();
        return;
      }
      if (
        rawQuestion.type === "binary-pairs" &&
        (e.key === "ArrowLeft" || e.key === "ArrowRight")
      ) {
        e.preventDefault();
        const pairs = rawQuestion.binaryPairs ?? [];
        const cur =
          answers[rawQuestion.id] && typeof answers[rawQuestion.id] === "object"
            ? answers[rawQuestion.id]
            : {};
        const nextPair = pairs.find((p) => !cur[p.id]);
        if (nextPair) {
          setAnswers((prev) => ({
            ...prev,
            [rawQuestion.id]: {
              ...cur,
              [nextPair.id]: e.key === "ArrowLeft" ? "left" : "right",
            },
          }));
        }
        return;
      }
      const num = parseInt(e.key, 10);
      if (num >= 1 && num <= 9) {
        const opts =
          rawQuestion.options ??
          rawQuestion.imageOptions ??
          rawQuestion.paletteCards ??
          [];
        const opt = opts[num - 1];
        if (!opt) return;
        e.preventDefault();
        const id = opt.id;
        if (
          rawQuestion.type === "multi-select" ||
          (rawQuestion.type === "image-grid" && rawQuestion.minSelect)
        ) {
          const cur = Array.isArray(answers[rawQuestion.id])
            ? answers[rawQuestion.id]
            : [];
          const max = rawQuestion.maxSelect ?? 99;
          const next = cur.includes(id)
            ? cur.filter((x) => x !== id)
            : cur.length < max
              ? [...cur, id]
              : cur;
          setAnswers((prev) => ({ ...prev, [rawQuestion.id]: next }));
        } else if (
          rawQuestion.type === "single-select" ||
          rawQuestion.type === "palette-cards" ||
          rawQuestion.type === "image-grid"
        ) {
          setAnswers((prev) => ({ ...prev, [rawQuestion.id]: id }));
          /* keyboard parity: selecting a palette re-themes the page too */
          if (rawQuestion.type === "palette-cards")
            setThemeOverride(paletteTheme(opt));
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [screen, interstitial, rawQuestion, answers, canProceed, advance, goBack]);

  const handleStart = useCallback(() => {
    clearSave();
    fadeSwap(() => {
      setScreen("quiz");
      setCurrentIdx(0);
      setAnimKey((k) => k + 1);
    });
  }, [fadeSwap, clearSave]);

  const handleResume = useCallback(() => {
    if (!savedGame) return;
    fadeSwap(() => {
      setMode(savedGame.mode);
      setAnswers(savedGame.answers ?? {});
      setCurrentIdx(
        Math.max(0, savedGame.currentIdx ?? 0),
      ); /* re-clamped vs. live sequence by FIX #3 */
      setScreen("quiz");
      setAnimKey((k) => k + 1);
    });
    setSavedGame(null);
  }, [savedGame, fadeSwap]);

  /* Return from results into the quiz with all answers intact. */
  const handleEdit = useCallback(
    (flowKey) => {
      fadeSwap(() => {
        setScreen("quiz");
        if (flowKey) {
          const idx = questions.findIndex((q) => q.flow === flowKey);
          setCurrentIdx(idx >= 0 ? idx : Math.max(0, questions.length - 1));
        } else {
          setCurrentIdx(Math.max(0, questions.length - 1));
        }
        setAnimKey((k) => k + 1);
      });
    },
    [fadeSwap, questions],
  );

  const handleRetake = useCallback(() => {
    clearSave();
    setAnswers({});
    setCurrentIdx(0);
    setScreen("intro");
    setThemeOverride(null);
    setInterstitial(null);
    setAnimKey((k) => k + 1);
  }, [clearSave]);

  const handleModeChange = useCallback((m) => {
    setMode(m);
    setAnswers({});
    setCurrentIdx(0);
    setThemeOverride(null);
  }, []);

  const tally = calculateTally(answers);
  const budgetRange =
    budgetPath === "guided" &&
    answers["b2a"] &&
    answers["b2b"] &&
    answers["b2c"] &&
    answers["b2d"] &&
    answers["b2e"] &&
    answers["b2f"]
      ? computeBudgetRange(
          answers["b2a"],
          answers["b2b"],
          answers["b2c"],
          answers["b2d"],
          answers["b2e"],
          answers["b2f"],
        )
      : null;

  const ui = { setThemeOverride };

  let body;
  if (screen === "results") {
    body = (
      <div key={animKey} className="quiz-enter">
        <ResultsPage
          mode={mode}
          tally={tally}
          answers={answers}
          budgetRange={budgetRange}
          onRetake={handleRetake}
          onEdit={handleEdit}
        />
      </div>
    );
  } else if (screen === "intro") {
    body = (
      <div key={animKey} className="quiz-enter">
        <IntroPage
          mode={mode}
          onStart={handleStart}
          onModeChange={handleModeChange}
          saved={savedGame}
          onResume={handleResume}
          onDiscardSave={clearSave}
        />
      </div>
    );
  } else if (interstitial) {
    const flowIdx = flowsInOrder.indexOf(interstitial);
    body = (
      <FlowInterstitial
        key={`inter-${interstitial}`}
        flow={interstitial}
        index={flowIdx + 1}
        total={flowsInOrder.length}
        onDone={() =>
          fadeSwap(() => {
            setInterstitial(null);
            setAnimKey((k) => k + 1);
          })
        }
      />
    );
  } else {
    const LayoutComponent = getLayoutComponent(rawQuestion);
    body = (
      <div>
        <QuizShell
          question={question}
          answer={answer}
          contentKey={animKey}
          contentFade={{ exiting, entered }}
          flowMeta={flowMeta}
          canProceed={canProceed}
          onNext={advance}
          onBack={goBack}
          budgetRange={budgetRange}
          showBudgetResult={
            rawQuestion.id === "b3" && budgetPath === "guided" && !!budgetRange
          }
          budgetAccent={question.accent}
          budgetBg={question.bg}
        >
          <LayoutComponent
            question={question}
            answer={answer}
            onAnswer={handleAnswer}
            ui={ui}
          />
        </QuizShell>
      </div>
    );
  }

  /* SMOOTH TRANSITIONS — one persistent layer owns the page background and
     cross-fades it between every screen and question. Content remounts with
     enter/exit animations inside it, but the color never hard-cuts. */
  const pageBg =
    screen === "quiz" && !interstitial && question ? question.bg : "#1a1714";

  return (
    <div className="style-explorer-root">
      <div
        className="q-vh"
        style={{
          position: "relative",
          overflow: "hidden",
          backgroundColor: pageBg,
          transition: "background-color 0.6s cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      >
        {/* env-proof page fade — applies only to screen-level changes; plain
            question steps keep the shell (header/footer) perfectly still and
            fade only the content area inside QuizShell */}
        <div
          key={`${screen}-${interstitial ?? "live"}`}
          style={{
            position: "relative",
            zIndex: 1,
            opacity: fadeScope === "page" && exiting ? 0 : 1,
            /* Exit quick and clean (shorter than the 300ms timer so it never
               truncates); entered pages stay fully visible. */
            transition: exiting
              ? "opacity 0.24s ease-in"
              : "opacity 0.55s cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        >
          {body}
        </div>
      </div>
    </div>
  );
}
