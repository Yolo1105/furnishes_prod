"use client";

import { CheckCircle2, AlertTriangle, XCircle, RefreshCw } from "lucide-react";
import { useState } from "react";
import { WORKFLOW_ROUTES } from "@/lib/site/workflow-routes";
import styles from "./ValidateContent.module.css";

type Status = "pass" | "warn" | "fail";

interface Check {
  id: string;
  label: string;
  note: string;
  status: Status;
  fixHref?: string;
}

const DEFAULT_CHECKS: Check[] = [
  {
    id: "style",
    label: "Style direction set",
    note: "Japandi Minimalism — looks great.",
    status: "pass",
  },
  {
    id: "budget",
    label: "Budget configured",
    note: "Tracking 5 categories, 73% allocated.",
    status: "pass",
  },
  {
    id: "room",
    label: "Room dimensions complete",
    note: "Missing ceiling height.",
    status: "warn",
    fixHref: WORKFLOW_ROUTES.assistant,
  },
  {
    id: "palette",
    label: "Colour palette selected",
    note: "5 colours harmonise well.",
    status: "pass",
  },
  {
    id: "lighting",
    label: "Lighting plan added",
    note: "No lighting pieces in room yet.",
    status: "fail",
    fixHref: "/collections",
  },
  {
    id: "flow",
    label: "Traffic flow clearance",
    note: "Sofa placement may block entry path.",
    status: "warn",
    fixHref: WORKFLOW_ROUTES.assistant,
  },
];

const STATUS_ICON: Record<Status, React.ReactNode> = {
  pass: <CheckCircle2 size={14} strokeWidth={2} />,
  warn: <AlertTriangle size={14} strokeWidth={2} />,
  fail: <XCircle size={14} strokeWidth={2} />,
};

const STATUS_CLASS: Record<Status, string> = {
  pass: styles.iconPass,
  warn: styles.iconWarn,
  fail: styles.iconFail,
};

const SCORE_LABEL = ["Poor", "Needs Work", "Fair", "Good", "Great", "Perfect"];

export function ValidateContent() {
  const checks = DEFAULT_CHECKS;
  const [running, setRunning] = useState(false);

  const passed = checks.filter((c) => c.status === "pass").length;
  const warned = checks.filter((c) => c.status === "warn").length;
  const failed = checks.filter((c) => c.status === "fail").length;
  const scoreOf = checks.length;
  const score = passed;
  const scorePct = Math.round((passed / scoreOf) * 100);

  const runCheck = () => {
    setRunning(true);
    // Simulate a re-check cycle
    setTimeout(() => setRunning(false), 1400);
  };

  return (
    <div className={styles.root}>
      {/* Score header */}
      <div className={styles.scoreCard}>
        <div className={styles.scoreLeft}>
          <p className={styles.eyebrow}>Design Health</p>
          <div className={styles.scoreRow}>
            <span className={styles.scoreNum}>{score}</span>
            <span className={styles.scoreOf}>/ {scoreOf}</span>
          </div>
          <p className={styles.scoreLabel}>{SCORE_LABEL[Math.min(score, 5)]}</p>
        </div>

        {/* Arc-style score ring (CSS conic-gradient) */}
        <div
          className={styles.ring}
          style={{
            background: `conic-gradient(var(--fur-accent, #f24a12) ${scorePct * 3.6}deg, var(--ring-track) 0deg)`,
          }}
          aria-hidden="true"
        >
          <div className={styles.ringInner}>
            <span className={styles.ringPct}>{scorePct}%</span>
          </div>
        </div>
      </div>

      {/* Status summary pills */}
      <div className={styles.pills}>
        <span className={`${styles.statusPill} ${styles.pillPass}`}>
          <CheckCircle2 size={10} strokeWidth={2.5} /> {passed} passed
        </span>
        <span className={`${styles.statusPill} ${styles.pillWarn}`}>
          <AlertTriangle size={10} strokeWidth={2.5} /> {warned} warning
          {warned !== 1 ? "s" : ""}
        </span>
        <span className={`${styles.statusPill} ${styles.pillFail}`}>
          <XCircle size={10} strokeWidth={2.5} /> {failed} failed
        </span>
      </div>

      {/* Checklist */}
      <div className={styles.checklist}>
        {checks.map((c) => (
          <div
            key={c.id}
            className={`${styles.checkRow} ${styles[`row_${c.status}`]}`}
          >
            <span className={`${styles.checkIcon} ${STATUS_CLASS[c.status]}`}>
              {STATUS_ICON[c.status]}
            </span>
            <div className={styles.checkMeta}>
              <p className={styles.checkLabel}>{c.label}</p>
              <p className={styles.checkNote}>{c.note}</p>
            </div>
            {(c.status === "warn" || c.status === "fail") && c.fixHref && (
              <a href={c.fixHref} className={styles.fixLink}>
                Fix →
              </a>
            )}
          </div>
        ))}
      </div>

      {/* Re-run check */}
      <button className={styles.runBtn} onClick={runCheck} disabled={running}>
        <RefreshCw
          size={13}
          strokeWidth={2}
          className={running ? styles.spinning : ""}
        />
        {running ? "Checking…" : "Re-run Design Check"}
      </button>
    </div>
  );
}
