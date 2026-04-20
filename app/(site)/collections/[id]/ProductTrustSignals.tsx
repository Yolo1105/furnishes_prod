"use client";

import styles from "./ProductDetailPage.module.css";

export function ProductTrustSignals() {
  return (
    <div className={styles.trustSignals}>
      <div className={styles.trustItem}>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          aria-hidden
        >
          <rect x="1" y="3" width="15" height="13" rx="2" />
          <path d="M16 8h4a2 2 0 012 2v9a2 2 0 01-2 2H6" />
          <circle cx="5.5" cy="18.5" r="2.5" />
          <circle cx="18.5" cy="18.5" r="2.5" />
        </svg>
        Free shipping over $500
      </div>
      <div className={styles.trustItem}>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          aria-hidden
        >
          <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
        White glove delivery
      </div>
      <div className={styles.trustItem}>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          aria-hidden
        >
          <path d="M9 14l-4-4 4-4" />
          <path d="M5 10h11a4 4 0 110 8h-1" />
        </svg>
        30-day returns
      </div>
      <div className={styles.trustItem}>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          aria-hidden
        >
          <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
        5-year warranty
      </div>
    </div>
  );
}
