"use client";

import { Plus, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import styles from "./BudgetContent.module.css";

// Mock budget data — replace with ProjectContext.budgetPlan when confirmed
const BUDGET = {
  total: 15000,
  currency: "USD",
  categories: [
    { name: "Seating", spent: 4280, alloc: 5000 },
    { name: "Lighting", spent: 890, alloc: 1500 },
    { name: "Dining", spent: 3650, alloc: 4000 },
    { name: "Storage", spent: 0, alloc: 2000 },
    { name: "Bedroom", spent: 3890, alloc: 2500 },
  ],
};

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);

export function BudgetContent() {
  const router = useRouter();

  const totalSpent = BUDGET.categories.reduce((s, c) => s + c.spent, 0);
  const remaining = BUDGET.total - totalSpent;
  const overallPct = Math.min(
    100,
    Math.round((totalSpent / BUDGET.total) * 100),
  );

  return (
    <div className={styles.root}>
      {/* Total summary */}
      <div className={styles.summary}>
        <div className={styles.summaryLeft}>
          <p className={styles.eyebrow}>Total Budget</p>
          <p className={styles.totalFig}>{fmt(BUDGET.total)}</p>
        </div>
        <div className={styles.summaryRight}>
          <div className={styles.pill}>
            <span className={styles.pillDot} />
            {overallPct}% used
          </div>
        </div>
      </div>

      {/* Wide progress bar */}
      <div
        className={styles.mainTrack}
        role="progressbar"
        aria-valuenow={overallPct}
      >
        <div
          className={`${styles.mainFill} ${overallPct > 90 ? styles.mainFillOver : ""}`}
          style={{ width: `${overallPct}%` }}
        />
      </div>
      <div className={styles.trackLabels}>
        <span className={styles.spentLabel}>{fmt(totalSpent)} spent</span>
        <span className={remaining < 0 ? styles.overLabel : styles.remLabel}>
          {remaining < 0
            ? `${fmt(Math.abs(remaining))} over`
            : `${fmt(remaining)} left`}
        </span>
      </div>

      {/* Category breakdown */}
      <div className={styles.breakdown}>
        <p className={styles.miniLabel}>By Category</p>
        {BUDGET.categories.map((cat) => {
          const pct = Math.min(100, Math.round((cat.spent / cat.alloc) * 100));
          const over = cat.spent > cat.alloc;
          return (
            <div key={cat.name} className={styles.catRow}>
              <div className={styles.catMeta}>
                <span className={styles.catName}>{cat.name}</span>
                <span
                  className={`${styles.catAmt} ${over ? styles.catOver : ""}`}
                >
                  {fmt(cat.spent)}
                  <span className={styles.catAlloc}> / {fmt(cat.alloc)}</span>
                </span>
              </div>
              <div className={styles.catTrack}>
                <div
                  className={`${styles.catFill} ${over ? styles.catFillOver : ""}`}
                  style={{ width: `${Math.min(100, pct)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <div className={styles.actions}>
        <button className={styles.logBtn}>
          <Plus size={13} strokeWidth={2.2} /> Log Expense
        </button>
        <button
          className={styles.fullBtn}
          onClick={() => router.push("/budget")}
        >
          Full Planner <ArrowRight size={12} strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}
