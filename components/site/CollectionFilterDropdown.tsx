"use client";

import {
  quickFilters,
  sortOptions,
  DEFAULT_SORT,
  type QuickFilterOption,
} from "@/content/site/collection";
import {
  normalizeQuickActive,
  type CollectionUrlState,
} from "@/lib/site/collection-navigation";
import { cn } from "@/lib/utils";
import styles from "./CollectionFilter.module.css";

function isSwatchOption(
  opt: QuickFilterOption,
): opt is { label: string; hex: string } {
  return typeof opt === "object" && opt !== null && "hex" in opt;
}

export type DropdownState = { id: string; top: number } | null;

type Props = {
  dropdown: DropdownState;
  onClose: () => void;
  state: CollectionUrlState;
  updateUrl: (next: CollectionUrlState) => void;
};

export function CollectionFilterDropdown({
  dropdown,
  onClose,
  state,
  updateUrl,
}: Props) {
  const isSortDropdown = dropdown?.id === "sort";
  const openFilter = dropdown
    ? quickFilters.find((f) => f.id === dropdown.id)
    : undefined;
  const openVals =
    dropdown && openFilter ? (state.quickActive[dropdown.id] ?? []) : [];

  const toggleQuick = (gid: string, val: string) => {
    const cur = state.quickActive[gid]?.[0];
    if (cur === val) {
      const next = { ...state.quickActive };
      delete next[gid];
      updateUrl({
        ...state,
        quickActive: normalizeQuickActive(next),
      });
      return;
    }
    updateUrl({
      ...state,
      quickActive: { ...state.quickActive, [gid]: [val] },
    });
  };

  const clearQuickGroup = (gid: string) => {
    const next = { ...state.quickActive };
    delete next[gid];
    updateUrl({ ...state, quickActive: normalizeQuickActive(next) });
  };

  const setSort = (s: string) => {
    updateUrl({ ...state, sort: s });
    onClose();
  };

  if (!dropdown || !(openFilter || isSortDropdown)) return null;

  return (
    <>
      <div
        role="presentation"
        className={styles.dropdownBackdrop}
        onClick={onClose}
        aria-hidden
      />

      <div
        role="dialog"
        aria-label={isSortDropdown ? "Sort options" : "Filter options"}
        onClick={(e) => e.stopPropagation()}
        className={cn("px-6 py-4 md:px-10", styles.dropdownPanel)}
        style={{ top: dropdown.top }}
      >
        {isSortDropdown ? (
          <div className={styles.dropdownColumns}>
            <div className={styles.dropdownAside}>
              <p className={styles.dropdownAsideTitle}>Sort</p>
              {state.sort !== DEFAULT_SORT && (
                <button
                  type="button"
                  className={styles.dropdownReset}
                  onClick={() => setSort(DEFAULT_SORT)}
                >
                  Reset
                </button>
              )}
            </div>
            <div className={styles.dropdownVRule} />
            <div className={styles.dropdownMain}>
              <div className={styles.sortGrid}>
                {sortOptions.map((s, i) => {
                  const active = state.sort === s;
                  return (
                    <button
                      key={s}
                      type="button"
                      className={cn(
                        styles.sortOption,
                        active && styles.sortOptionActive,
                      )}
                      style={{
                        animation: `listing-filter-fade-up 0.18s ease ${i * 12}ms both`,
                      }}
                      onClick={() => setSort(s)}
                    >
                      <span className={styles.sortOptionLabel}>{s}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ) : openFilter ? (
          <div className={styles.dropdownColumns}>
            <div className={styles.dropdownAside}>
              <p className={styles.dropdownAsideTitle}>{openFilter.label}</p>
              {openVals.length > 0 && (
                <button
                  type="button"
                  className={styles.dropdownReset}
                  onClick={() => clearQuickGroup(dropdown.id)}
                >
                  Clear
                </button>
              )}
            </div>
            <div className={styles.dropdownVRule} />
            <div className={styles.dropdownMain}>
              {openFilter.type === "swatch" && (
                <div className={styles.swatchGrid}>
                  {openFilter.options.map((opt, i) => {
                    if (!isSwatchOption(opt)) return null;
                    const active = openVals.includes(opt.label);
                    const light = ["#F2ECE4", "#E8E0D0", "#FAFAFA"].includes(
                      opt.hex,
                    );
                    return (
                      <button
                        key={opt.label}
                        type="button"
                        className={styles.swatchBtn}
                        style={{
                          animation: `listing-filter-fade-up 0.18s ease ${i * 18}ms both`,
                        }}
                        onClick={() => toggleQuick(dropdown.id, opt.label)}
                      >
                        <span
                          className={cn(
                            styles.swatchDot,
                            light && styles.swatchDotLight,
                            active && styles.swatchDotActive,
                          )}
                          style={{ background: opt.hex }}
                        />
                        <span
                          className={cn(
                            styles.swatchLabel,
                            active && styles.swatchLabelActive,
                          )}
                        >
                          {opt.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
              {openFilter.type === "price" && (
                <div className={styles.priceRow}>
                  {openFilter.options.map((opt, i) => {
                    const val = typeof opt === "string" ? opt : opt.label;
                    const active = openVals.includes(val);
                    return (
                      <button
                        key={val}
                        type="button"
                        className={cn(
                          styles.priceChip,
                          active && styles.priceChipActive,
                        )}
                        style={{
                          animation: `listing-filter-fade-up 0.18s ease ${i * 28}ms both`,
                        }}
                        onClick={() => toggleQuick(dropdown.id, val)}
                      >
                        <span className={styles.priceChipLabel}>{val}</span>
                      </button>
                    );
                  })}
                </div>
              )}
              {!openFilter.type && (
                <div
                  className={cn(
                    styles.quickGrid,
                    openFilter.options.length > 12
                      ? styles.quickGridCols4
                      : openFilter.options.length > 6
                        ? styles.quickGridCols3
                        : styles.quickGridCols2,
                  )}
                >
                  {openFilter.options.map((opt, i) => {
                    const val = typeof opt === "string" ? opt : opt.label;
                    const active = openVals.includes(val);
                    return (
                      <button
                        key={val}
                        type="button"
                        className={cn(
                          styles.quickOption,
                          active && styles.quickOptionActive,
                        )}
                        style={{
                          animation: `listing-filter-fade-up 0.18s ease ${i * 12}ms both`,
                        }}
                        onClick={() => toggleQuick(dropdown.id, val)}
                      >
                        <span className={styles.quickOptionLabel}>{val}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </>
  );
}
