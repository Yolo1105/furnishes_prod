"use client";

import { useMemo, useState } from "react";
import { AccountWireFrame } from "@/features/account/primitives/AccountWireFrame";
import { AccountWireHeader } from "@/features/account/primitives/AccountWireHeader";

type ActivityFilter = "All" | "Eva" | "Orders" | "Projects";

type ActivityItem = {
  title: string;
  detail: string;
  when: string;
  kind: "Eva" | "Orders" | "Projects" | "Other";
};

const FILTERS: ActivityFilter[] = ["All", "Eva", "Orders", "Projects"];

/**
 * Route-owned History (activity timeline).
 */
export function ActivityPage({ items }: { items: ActivityItem[] }) {
  const [filter, setFilter] = useState<ActivityFilter>("All");

  const visible = useMemo(() => {
    if (filter === "All") return items;
    if (filter === "Orders") return [];
    return items.filter((item) => item.kind === filter);
  }, [filter, items]);

  const emptyTitle =
    filter === "Orders" ? "Orders activity is deferred" : "No activity yet";
  const emptyDetail =
    filter === "Orders"
      ? "Commerce events will show here when orders are live."
      : "Chat, projects, and uploads will show up here.";

  return (
    <AccountWireFrame>
      <AccountWireHeader
        eyebrow="Account"
        title="History"
        subtitle="A timeline of everything happening across your studio."
      />
      <div className="wf-tools">
        {FILTERS.map((chip) => (
          <button
            key={chip}
            type="button"
            className={filter === chip ? "wf-chip on" : "wf-chip"}
            onClick={() => setFilter(chip)}
          >
            {chip}
          </button>
        ))}
      </div>
      {visible.length > 0 ? (
        <div className="wf-list">
          {visible.map((it) => (
            <div className="wf-row" key={`${it.title}-${it.when}-${it.detail}`}>
              <span className="wf-dot" />
              <div className="wf-row__main">
                <span className="wf-row__t">{it.title}</span>
                <span className="wf-row__p">{it.detail}</span>
              </div>
              <span className="wf-row__m">{it.when}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="wf-blank">
          <p className="wf-blank__t">{emptyTitle}</p>
          <p className="wf-blank__p">{emptyDetail}</p>
        </div>
      )}
    </AccountWireFrame>
  );
}
