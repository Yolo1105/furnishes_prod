"use client";

import {
  BarChart2,
  Download,
  Clock,
  CheckCircle2,
  Palette,
  Wallet,
  LayoutGrid,
} from "lucide-react";
import styles from "./ReportContent.module.css";

const STATS = [
  { label: "Items Added", value: "7", sub: "4 confirmed", icon: CheckCircle2 },
  { label: "Budget Used", value: "73%", sub: "$10,710 spent", icon: Wallet },
  { label: "Rooms Planned", value: "1", sub: "Living Room", icon: LayoutGrid },
  { label: "Style Match", value: "94%", sub: "Japandi score", icon: Palette },
];

const ACTIVITY = [
  { icon: Palette, label: "Style set to Japandi Minimalism", when: "2h ago" },
  {
    icon: Wallet,
    label: "Bedroom budget increased to $2,500",
    when: "Yesterday",
  },
  {
    icon: LayoutGrid,
    label: "Living Room floor plan updated",
    when: "2 days ago",
  },
  {
    icon: CheckCircle2,
    label: "Nara Lounge Chair added to room",
    when: "3 days ago",
  },
];

export function ReportContent() {
  return (
    <div className={styles.root}>
      {/* Header */}
      <div className={styles.header}>
        <BarChart2 size={14} strokeWidth={1.8} className={styles.headerIcon} />
        <div className={styles.headerMeta}>
          <p className={styles.eyebrow}>Project Report</p>
          <p className={styles.title}>Living Room — Spring 2025</p>
        </div>
      </div>

      {/* 2 × 2 stat grid */}
      <div className={styles.grid}>
        {STATS.map((s) => (
          <div key={s.label} className={styles.stat}>
            <s.icon size={13} strokeWidth={1.8} className={styles.statIcon} />
            <p className={styles.statVal}>{s.value}</p>
            <p className={styles.statLabel}>{s.label}</p>
            <p className={styles.statSub}>{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Completion bar */}
      <div className={styles.completionRow}>
        <span className={styles.completionLabel}>Overall completion</span>
        <span className={styles.completionPct}>68%</span>
      </div>
      <div className={styles.completionTrack}>
        <div className={styles.completionFill} style={{ width: "68%" }} />
      </div>

      {/* Recent activity */}
      <div className={styles.activity}>
        <p className={styles.miniLabel}>Recent Activity</p>
        {ACTIVITY.map((a, i) => (
          <div key={i} className={styles.activityRow}>
            <a.icon
              size={12}
              strokeWidth={1.8}
              className={styles.activityIcon}
            />
            <div className={styles.activityMeta}>
              <p className={styles.activityText}>{a.label}</p>
              <p className={styles.activityWhen}>
                <Clock size={9} strokeWidth={2} /> {a.when}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Export */}
      <button className={styles.exportBtn}>
        <Download size={13} strokeWidth={2} />
        Export PDF Report
      </button>
    </div>
  );
}
