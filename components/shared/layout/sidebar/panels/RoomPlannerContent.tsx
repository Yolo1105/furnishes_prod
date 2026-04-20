"use client";

import Link from "next/link";
import { LayoutGrid } from "lucide-react";
import { WORKFLOW_ROUTES } from "@/lib/site/workflow-routes";
import styles from "./RoomPlannerContent.module.css";

// Mock room data — replace with ProjectContext.roomConfig when confirmed
const ROOM = {
  name: "Living Room",
  width: 18,
  length: 22,
  unit: "ft" as const,
};
const ITEMS_PLACED = 4;

export function RoomPlannerContent() {
  // SVG floor-plan scale (fit 268px wide panel content area)
  const scale = 210 / Math.max(ROOM.width, ROOM.length);
  const svgW = Math.round(ROOM.width * scale);
  const svgH = Math.round(ROOM.length * scale);

  return (
    <div className={styles.root}>
      {/* Header */}
      <div className={styles.header}>
        <LayoutGrid size={14} strokeWidth={1.8} className={styles.headerIcon} />
        <div className={styles.headerMeta}>
          <p className={styles.eyebrow}>Room preview</p>
          <p className={styles.roomName}>{ROOM.name}</p>
        </div>
        <span className={styles.badge}>Sample</span>
      </div>

      {/* SVG floor plan */}
      <div className={styles.planWrap}>
        <svg
          width={svgW}
          height={svgH}
          viewBox={`0 0 ${svgW} ${svgH}`}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={styles.plan}
          aria-label={`${ROOM.name} floor plan (illustrative)`}
        >
          {/* Room outline */}
          <rect
            x="1"
            y="1"
            width={svgW - 2}
            height={svgH - 2}
            rx="3"
            stroke="#C4622D"
            strokeWidth="1.5"
            fill="#FCF2E8"
          />
          {/* Door swing */}
          <path
            d={`M 1 ${svgH - 34} L 1 ${svgH - 34 + 26} Q 27 ${svgH - 34 + 26} 27 ${svgH - 34}`}
            stroke="#C4622D"
            strokeWidth="1"
            strokeDasharray="3 2"
            fill="none"
          />
          {/* Window top */}
          <line
            x1="40"
            y1="1"
            x2="90"
            y2="1"
            stroke="#C4622D"
            strokeWidth="2.5"
          />
          <line
            x1="55"
            y1="1"
            x2="55"
            y2="8"
            stroke="#C4622D"
            strokeWidth="1"
          />
          <line
            x1="75"
            y1="1"
            x2="75"
            y2="8"
            stroke="#C4622D"
            strokeWidth="1"
          />
          {/* Sofa */}
          <rect
            x="20"
            y="30"
            width={Math.round(svgW * 0.45)}
            height="28"
            rx="5"
            fill="#E8D5B5"
            stroke="#C4622D"
            strokeWidth="0.8"
          />
          <rect
            x="20"
            y="30"
            width={Math.round(svgW * 0.45)}
            height="10"
            rx="4"
            fill="#D4C5A9"
          />
          {/* Coffee table */}
          <rect
            x={Math.round(svgW * 0.28)}
            y="68"
            width="38"
            height="24"
            rx="4"
            fill="#E8D5B5"
            stroke="#C4622D"
            strokeWidth="0.8"
          />
          {/* Armchair */}
          <rect
            x={Math.round(svgW * 0.68)}
            y="28"
            width="22"
            height="22"
            rx="5"
            fill="#E8D5B5"
            stroke="#C4622D"
            strokeWidth="0.8"
          />
          {/* Floor lamp */}
          <line
            x1={Math.round(svgW * 0.82)}
            y1="56"
            x2={Math.round(svgW * 0.82)}
            y2="72"
            stroke="#C4622D"
            strokeWidth="1.2"
          />
          <ellipse
            cx={Math.round(svgW * 0.82)}
            cy="54"
            rx="7"
            ry="4"
            fill="#F5EFE7"
            stroke="#C4622D"
            strokeWidth="0.8"
          />
          {/* Dimension ticks */}
          <text
            x={svgW / 2}
            y={svgH - 6}
            fontSize="8"
            fill="#9e8d84"
            textAnchor="middle"
            fontFamily="inherit"
          >
            {ROOM.width}
            {ROOM.unit}
          </text>
          <text
            x="6"
            y={svgH / 2}
            fontSize="8"
            fill="#9e8d84"
            textAnchor="middle"
            transform={`rotate(-90, 6, ${svgH / 2})`}
            fontFamily="inherit"
          >
            {ROOM.length}
            {ROOM.unit}
          </text>
        </svg>
      </div>

      {/* Dimension pills */}
      <div className={styles.dimRow}>
        <div className={styles.dimPill}>
          <span className={styles.dimVal}>{ROOM.width}</span>
          <span className={styles.dimUnit}>{ROOM.unit} wide</span>
        </div>
        <span className={styles.dimX}>×</span>
        <div className={styles.dimPill}>
          <span className={styles.dimVal}>{ROOM.length}</span>
          <span className={styles.dimUnit}>{ROOM.unit} long</span>
        </div>
        <div className={styles.dimPill} style={{ marginLeft: "auto" }}>
          <span className={styles.dimVal}>{ROOM.width * ROOM.length}</span>
          <span className={styles.dimUnit}>{ROOM.unit}²</span>
        </div>
      </div>

      {/* Tip */}
      <div className={styles.tip}>
        <span className={styles.tipDot} />
        <p className={styles.tipText}>
          Allow <strong>36&Prime;</strong> clearance around seating where
          possible. This diagram uses mock dimensions and ~{ITEMS_PLACED} sample
          pieces — use{" "}
          <Link href={WORKFLOW_ROUTES.assistant} className={styles.chatLink}>
            Eva
          </Link>{" "}
          to talk through layout for your real room.
        </p>
      </div>
    </div>
  );
}
