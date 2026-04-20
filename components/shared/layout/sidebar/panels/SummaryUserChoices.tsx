"use client";

import { useContext } from "react";
import Link from "next/link";
import { Palette, Wallet, LayoutGrid } from "lucide-react";
import { WORKFLOW_ROUTES } from "@/lib/site/workflow-routes";
import { ProjectContext } from "@/contexts/ProjectContext";
import styles from "./SummaryUserChoices.module.css";

export function SummaryUserChoices() {
  const ctx = useContext(ProjectContext);
  const { stylePack, budgetPlan, roomConfig } = ctx ?? {};

  const budgetPct = budgetPlan
    ? Math.min(100, Math.round((budgetPlan.spent / budgetPlan.total) * 100))
    : 0;

  const fmt = (n: number, currency: string) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(n);

  return (
    <div className={styles.root}>
      <p className={styles.eyebrow}>Project snapshot</p>

      {/* Style ──────────────────────────────────────────────────────── */}
      <div className={styles.card}>
        <div className={styles.cardHead}>
          <Palette size={13} strokeWidth={1.8} className={styles.cardIcon} />
          <span className={styles.cardTag}>Style</span>
          {stylePack?.mood && (
            <span className={styles.moodBadge}>{stylePack.mood}</span>
          )}
        </div>

        {stylePack ? (
          <>
            <p key={stylePack.direction} className={styles.direction}>
              {stylePack.direction}
            </p>
            {stylePack.palette.length > 0 && (
              <div className={styles.palette}>
                {stylePack.palette.slice(0, 7).map((hex, i) => (
                  <span
                    key={i}
                    className={styles.swatch}
                    style={{ background: hex }}
                    title={hex}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          <EmptyHint label="No style chosen yet" href={WORKFLOW_ROUTES.style} />
        )}
      </div>

      {/* Budget ─────────────────────────────────────────────────────── */}
      <div className={styles.card}>
        <div className={styles.cardHead}>
          <Wallet size={13} strokeWidth={1.8} className={styles.cardIcon} />
          <span className={styles.cardTag}>Budget</span>
          {budgetPlan && (
            <span
              className={`${styles.budgetPctBadge} ${budgetPct > 85 ? styles.budgetPctWarn : ""}`}
            >
              {budgetPct}%
            </span>
          )}
        </div>

        {budgetPlan ? (
          <>
            <div className={styles.budgetRow}>
              <span className={styles.budgetSpent}>
                {fmt(budgetPlan.spent, budgetPlan.currency)}
              </span>
              <span className={styles.budgetTotal}>
                / {fmt(budgetPlan.total, budgetPlan.currency)}
              </span>
            </div>
            <div
              className={styles.track}
              role="progressbar"
              aria-valuenow={budgetPct}
            >
              <div
                className={`${styles.fill} ${budgetPct > 85 ? styles.fillWarn : ""}`}
                style={{ width: `${budgetPct}%` }}
              />
            </div>
            <p className={styles.budgetLeft}>
              {fmt(budgetPlan.total - budgetPlan.spent, budgetPlan.currency)}{" "}
              remaining
            </p>
          </>
        ) : (
          <EmptyHint label="Set your budget" href={WORKFLOW_ROUTES.budget} />
        )}
      </div>

      {/* Room ───────────────────────────────────────────────────────── */}
      <div className={styles.card}>
        <div className={styles.cardHead}>
          <LayoutGrid size={13} strokeWidth={1.8} className={styles.cardIcon} />
          <span className={styles.cardTag}>{roomConfig?.name ?? "Room"}</span>
        </div>

        {roomConfig ? (
          <>
            <p className={styles.dims}>
              {roomConfig.width} <span className={styles.dimsX}>×</span>{" "}
              {roomConfig.length}
              {roomConfig.height ? (
                <>
                  {" "}
                  <span className={styles.dimsX}>×</span> {roomConfig.height}
                </>
              ) : null}
              <span className={styles.dimsUnit}> {roomConfig.unit}</span>
            </p>
            <p className={styles.area}>
              {(roomConfig.width * roomConfig.length).toFixed(1)}{" "}
              {roomConfig.unit}² floor area
            </p>
          </>
        ) : (
          <EmptyHint label="Refine with Eva" href={WORKFLOW_ROUTES.assistant} />
        )}
      </div>
    </div>
  );
}

function EmptyHint({ label, href }: { label: string; href: string }) {
  return (
    <div className={styles.emptyHint}>
      <Link href={href} className={styles.emptyLink}>
        {label} →
      </Link>
    </div>
  );
}
