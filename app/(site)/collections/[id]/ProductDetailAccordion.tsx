"use client";

import { useState, type ReactNode } from "react";
import styles from "./ProductDetailPage.module.css";

export function ProductDetailAccordion({
  title,
  defaultOpen,
  children,
}: {
  title: string;
  defaultOpen: boolean;
  children: ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(!defaultOpen);
  return (
    <div className={styles.accordionSection}>
      <div
        className={styles.accordionHeader}
        onClick={() => setCollapsed((c) => !c)}
      >
        <h3>{title}</h3>
        <span
          className={`${styles.accordionToggle} ${collapsed ? "" : styles.rotated}`}
        >
          +
        </span>
      </div>
      {!collapsed && <div className={styles.accordionContent}>{children}</div>}
    </div>
  );
}
