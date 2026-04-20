"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useCollectionUrlState } from "@/hooks/site/useCollectionUrlState";
import { parsePriceRange } from "@/lib/site/parsePriceRange";
import {
  buildListingBreadcrumbs,
  getCollectionListingHeroDescription,
  getDefaultListingQuickActive,
  isListingQuickDefault,
} from "@/lib/site/collection-navigation";
import {
  collectionProducts as products,
  quickFilters,
  DEFAULT_SORT,
  type CollectionProduct,
} from "@/content/site/collection";
import { CollectionHeroDirectoryHeadline } from "@/components/site/CollectionDirectoryTrail";
import { PageHeader, PageHeaderAccentRule } from "@/components/site/PageHeader";
import { PageHeaderIntroSlot } from "@/components/site/PageHeaderIntroSlot";
import {
  CollectionFilterDropdown,
  type DropdownState,
} from "@/components/site/CollectionFilterDropdown";
import { CollectionListingProductGrid } from "@/components/site/CollectionListingProductGrid";
import styles from "./CollectionFilter.module.css";

export function CollectionFilter() {
  const { state, updateUrl } = useCollectionUrlState();
  const [dropdown, setDropdown] = useState<DropdownState>(null);
  const [view] = useState<"editorial" | "grid">("editorial");
  const [searchDraft, setSearchDraft] = useState(state.q);
  const [prevUrlQ, setPrevUrlQ] = useState(state.q);
  if (state.q !== prevUrlQ) {
    setPrevUrlQ(state.q);
    setSearchDraft(state.q);
  }

  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  useEffect(
    () => () => {
      clearTimeout(searchTimerRef.current);
    },
    [],
  );

  const commitSearch = (raw: string) => {
    const s = stateRef.current;
    updateUrl({ ...s, q: raw.trim() });
  };

  const onSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setSearchDraft(v);
    clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => commitSearch(v), 280);
  };

  const clearSearch = () => {
    setSearchDraft("");
    clearTimeout(searchTimerRef.current);
    commitSearch("");
  };

  useEffect(() => {
    if (!dropdown) return;
    const closeOnScroll = () => setDropdown(null);
    window.addEventListener("scroll", closeOnScroll, {
      capture: true,
      passive: true,
    });
    return () => window.removeEventListener("scroll", closeOnScroll, true);
  }, [dropdown]);

  const breadcrumbItems = useMemo(
    () => buildListingBreadcrumbs(state),
    [state],
  );

  const heroDescription = useMemo(
    () => getCollectionListingHeroDescription(state),
    [state],
  );

  const priceMatchesQuick = (p: CollectionProduct, priceOpts: string[]) => {
    if (!priceOpts.length) return true;
    return priceOpts.some((opt) => {
      const range = parsePriceRange(opt);
      return range && p.price >= range.min && p.price <= range.max;
    });
  };

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (searchDraft.trim()) {
        const k = searchDraft.toLowerCase();
        if (
          !p.name.toLowerCase().includes(k) &&
          !p.brand.toLowerCase().includes(k)
        )
          return false;
      }
      const catActive = state.quickActive.category ?? [];
      if (catActive.length > 0 && !catActive.includes(p.category)) return false;
      const priceActive = state.quickActive.price ?? [];
      if (!priceMatchesQuick(p, priceActive)) return false;
      return true;
    });
  }, [searchDraft, state.quickActive]);

  const sortedProducts = useMemo(() => {
    const list = [...filteredProducts];
    if (state.sort === "Price: Low to High")
      list.sort((a, b) => a.price - b.price);
    else if (state.sort === "Price: High to Low")
      list.sort((a, b) => b.price - a.price);
    return list;
  }, [filteredProducts, state.sort]);

  const listingIsQuickDefault = useMemo(
    () => isListingQuickDefault(state.quickActive),
    [state.quickActive],
  );

  const handleFilterBtn = (
    e: React.MouseEvent<HTMLButtonElement>,
    filterId: string,
  ) => {
    if (dropdown?.id === filterId) {
      setDropdown(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    setDropdown({ id: filterId, top: rect.bottom });
  };

  return (
    <>
      <CollectionFilterDropdown
        dropdown={dropdown}
        onClose={() => setDropdown(null)}
        state={state}
        updateUrl={updateUrl}
      />

      <div className={styles.listingRoot}>
        <div className="px-6 pt-[calc(1rem+1px)] pb-0 md:px-10 md:pt-[calc(1.25rem+1px)] md:pb-1">
          <PageHeader
            columnAlign="start"
            tag={
              <PageHeaderIntroSlot step={0}>
                <PageHeaderAccentRule />
              </PageHeaderIntroSlot>
            }
            headline={
              <PageHeaderIntroSlot step={1} className="w-full min-w-0">
                <CollectionHeroDirectoryHeadline items={breadcrumbItems} />
              </PageHeaderIntroSlot>
            }
            belowTitleSlot={
              <PageHeaderIntroSlot
                step={2}
                className="w-full max-w-full overflow-x-auto"
              >
                <p className="m-0 text-left font-sans text-sm leading-relaxed font-light whitespace-nowrap text-[var(--color-primary)]/70 md:text-base lg:text-xl">
                  {heroDescription}
                </p>
              </PageHeaderIntroSlot>
            }
          />
        </div>

        <div className={styles.listingStickyChrome}>
          <div className={styles.filterBar}>
            <div className={styles.filterRow1}>
              <div className={styles.filterRow1Left}>
                <div
                  className={styles.quickFilterChips}
                  role="group"
                  aria-label="Quick filters"
                >
                  <button
                    type="button"
                    className={`${styles.quickFilterChip} ${listingIsQuickDefault ? styles.quickFilterChipActive : ""}`}
                    onClick={() =>
                      updateUrl({
                        quickActive: getDefaultListingQuickActive(),
                        sort: state.sort,
                        q: state.q,
                      })
                    }
                    aria-pressed={listingIsQuickDefault}
                  >
                    Show all
                  </button>
                  {quickFilters.map((filter) => {
                    const v = state.quickActive[filter.id]?.[0];
                    const count = v ? 1 : 0;
                    const isOpen = dropdown?.id === filter.id;
                    return (
                      <button
                        key={filter.id}
                        type="button"
                        className={`${styles.quickFilterChip} ${count > 0 || isOpen ? styles.quickFilterChipActive : ""}`}
                        onClick={(e) => handleFilterBtn(e, filter.id)}
                        aria-expanded={isOpen}
                        aria-haspopup="true"
                      >
                        {filter.label}
                        {count > 0 && (
                          <span
                            className={styles.quickFilterCount}
                            aria-label={`${count} selected`}
                          >
                            {count}
                          </span>
                        )}
                        <svg
                          className={styles.quickFilterChevron}
                          viewBox="0 0 12 12"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden
                        >
                          <path d="M3 5l3 3 3-3" />
                        </svg>
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    className={`${styles.quickFilterChip} ${dropdown?.id === "sort" || state.sort !== DEFAULT_SORT ? styles.quickFilterChipActive : ""}`}
                    onClick={(e) => handleFilterBtn(e, "sort")}
                    aria-expanded={dropdown?.id === "sort"}
                    aria-haspopup="true"
                  >
                    Sort
                    <svg
                      className={styles.quickFilterChevron}
                      viewBox="0 0 12 12"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden
                    >
                      <path d="M3 5l3 3 3-3" />
                    </svg>
                  </button>
                </div>
              </div>
              <div className={styles.filterRow1Right}>
                <div
                  className={`${styles.searchWrap} ${searchDraft ? styles.searchWrapHasClear : ""}`}
                >
                  {searchDraft ? (
                    <button
                      type="button"
                      className={`${styles.filterClear} ${styles.searchClear}`}
                      onClick={clearSearch}
                    >
                      Clear
                    </button>
                  ) : null}
                  <svg
                    className={styles.searchIcon}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <circle cx="11" cy="11" r="8" />
                    <path d="M21 21l-4.35-4.35" />
                  </svg>
                  <input
                    type="search"
                    className={styles.filterInput}
                    placeholder="Search"
                    value={searchDraft}
                    onChange={onSearchChange}
                    aria-label="Search products"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 pt-4 pb-20 md:px-10">
          <CollectionListingProductGrid
            view={view}
            sortedProducts={sortedProducts}
            urlState={state}
          />
        </div>
      </div>
    </>
  );
}
