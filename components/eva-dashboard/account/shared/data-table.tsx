"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

export type Column<T> = {
  id: string;
  header: string;
  cell: (row: T) => ReactNode;
  sortable?: boolean;
  sortAccessor?: (row: T) => string | number;
  align?: "left" | "right" | "center";
  width?: string; // tailwind class e.g. "w-32"
  muted?: boolean;
  hiddenOnMobile?: boolean;
};

/**
 * Minimal, legible data table.
 *
 * - Hover background on rows.
 * - Optional sortable columns (click header to cycle asc → desc → off).
 * - Optional selection with per-row checkboxes and bulk-action slot.
 * - Mobile: cells with `hiddenOnMobile` collapse below md breakpoint.
 * - Empty rendering is deferred to the caller — pass an EmptyState sibling.
 */
export function DataTable<T extends { id: string }>({
  columns,
  rows,
  onRowClick,
  selectable,
  bulkActions,
  getRowHref,
}: {
  columns: Column<T>[];
  rows: T[];
  onRowClick?: (row: T) => void;
  selectable?: boolean;
  bulkActions?: (selected: T[]) => ReactNode;
  getRowHref?: (row: T) => string | undefined;
}) {
  const [sort, setSort] = useState<{ col: string; dir: "asc" | "desc" } | null>(
    null,
  );
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const sortedRows = (() => {
    if (!sort) return rows;
    const col = columns.find((c) => c.id === sort.col);
    if (!col?.sortAccessor) return rows;
    const copy = [...rows];
    copy.sort((a, b) => {
      const av = col.sortAccessor!(a);
      const bv = col.sortAccessor!(b);
      if (av < bv) return sort.dir === "asc" ? -1 : 1;
      if (av > bv) return sort.dir === "asc" ? 1 : -1;
      return 0;
    });
    return copy;
  })();

  const toggleSort = (id: string) => {
    setSort((prev) => {
      if (!prev || prev.col !== id) return { col: id, dir: "asc" };
      if (prev.dir === "asc") return { col: id, dir: "desc" };
      return null;
    });
  };

  const allSelected =
    sortedRows.length > 0 && sortedRows.every((r) => selected.has(r.id));
  const toggleAll = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelected) sortedRows.forEach((r) => next.delete(r.id));
      else sortedRows.forEach((r) => next.add(r.id));
      return next;
    });
  };
  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const selectedRows = sortedRows.filter((r) => selected.has(r.id));

  return (
    <div className="border-border bg-card overflow-hidden border">
      {selectable && bulkActions && selected.size > 0 && (
        <div className="bg-muted border-border flex items-center justify-between border-b px-4 py-2">
          <span className="text-foreground text-xs font-medium">
            {selected.size} selected
          </span>
          <div className="flex items-center gap-2">
            {bulkActions(selectedRows)}
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-border bg-muted/30 border-b">
              {selectable && (
                <th className="w-10 px-3 py-2.5 text-left">
                  <input
                    type="checkbox"
                    aria-label="Select all"
                    checked={allSelected}
                    onChange={toggleAll}
                    className="accent-primary h-3.5 w-3.5"
                  />
                </th>
              )}
              {columns.map((c) => {
                const sortIcon =
                  sort?.col === c.id ? (
                    sort.dir === "asc" ? (
                      <ChevronUp className="h-3 w-3" />
                    ) : (
                      <ChevronDown className="h-3 w-3" />
                    )
                  ) : null;
                return (
                  <th
                    key={c.id}
                    scope="col"
                    className={`text-muted-foreground px-3 py-2.5 text-[10px] font-semibold tracking-[0.14em] uppercase ${
                      c.align === "right"
                        ? "text-right"
                        : c.align === "center"
                          ? "text-center"
                          : "text-left"
                    } ${c.width ?? ""} ${c.hiddenOnMobile ? "hidden md:table-cell" : ""}`}
                  >
                    {c.sortable ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(c.id)}
                        className="hover:text-foreground inline-flex items-center gap-1 transition-colors"
                      >
                        {c.header}
                        {sortIcon}
                      </button>
                    ) : (
                      c.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((r, idx) => {
              const clickable = !!onRowClick || !!getRowHref;
              const handleClick = () => {
                if (onRowClick) onRowClick(r);
                else if (getRowHref) {
                  const href = getRowHref(r);
                  if (href) window.location.href = href;
                }
              };
              return (
                <tr
                  key={r.id}
                  onClick={clickable ? handleClick : undefined}
                  className={`border-border border-b last:border-0 ${
                    clickable ? "hover:bg-muted/40 cursor-pointer" : ""
                  } ${idx % 2 === 1 ? "bg-muted/10" : ""}`}
                >
                  {selectable && (
                    <td
                      className="px-3 py-3"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        aria-label="Select row"
                        checked={selected.has(r.id)}
                        onChange={() => toggleOne(r.id)}
                        className="accent-primary h-3.5 w-3.5"
                      />
                    </td>
                  )}
                  {columns.map((c) => (
                    <td
                      key={c.id}
                      className={`px-3 py-3 ${
                        c.align === "right"
                          ? "text-right"
                          : c.align === "center"
                            ? "text-center"
                            : "text-left"
                      } ${c.muted ? "text-muted-foreground" : "text-foreground"} ${
                        c.hiddenOnMobile ? "hidden md:table-cell" : ""
                      }`}
                    >
                      {c.cell(r)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
