"use client";

import { useState } from "react";
import { Search, Clock, TrendingUp, X, ArrowUpRight } from "lucide-react";
import styles from "./SearchContent.module.css";

const RECENT = ["Japandi sofa", "Travertine coffee table", "Linen curtains"];
const TRENDING = [
  "Boucle accent chair",
  "Arched floor lamp",
  "Rattan sideboard",
  "Wabi-sabi decor",
  "Fluted vase",
  "Organic rug",
];

const FEATURED = [
  {
    name: "Nara Lounge Chair",
    category: "Seating",
    price: "$1,740",
    href: "/collections",
  },
  {
    name: "Lume Floor Lamp",
    category: "Lighting",
    price: "$890",
    href: "/collections",
  },
  {
    name: "Alto Shelf System",
    category: "Storage",
    price: "$2,190",
    href: "/collections",
  },
];

export function SearchContent() {
  const [query, setQuery] = useState("");

  return (
    <div className={styles.root}>
      {/* Search input */}
      <div className={styles.inputWrap}>
        <Search size={14} strokeWidth={1.8} className={styles.inputIcon} />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search pieces, styles, rooms…"
          className={styles.input}
          aria-label="Search"
        />
        {query && (
          <button
            className={styles.clearBtn}
            onClick={() => setQuery("")}
            aria-label="Clear"
          >
            <X size={11} strokeWidth={2.5} />
          </button>
        )}
      </div>

      {/* Recent */}
      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <Clock size={11} strokeWidth={1.8} className={styles.sectionIcon} />
          <span className={styles.sectionLabel}>Recent</span>
        </div>
        <ul className={styles.recentList}>
          {RECENT.map((term) => (
            <li key={term}>
              <button
                className={styles.recentBtn}
                onClick={() => setQuery(term)}
              >
                <span>{term}</span>
                <ArrowUpRight
                  size={11}
                  strokeWidth={2}
                  className={styles.recentArrow}
                />
              </button>
            </li>
          ))}
        </ul>
      </section>

      {/* Trending */}
      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <TrendingUp
            size={11}
            strokeWidth={1.8}
            className={styles.sectionIcon}
          />
          <span className={styles.sectionLabel}>Trending</span>
        </div>
        <div className={styles.chips}>
          {TRENDING.map((term) => (
            <button
              key={term}
              className={styles.chip}
              onClick={() => setQuery(term)}
            >
              {term}
            </button>
          ))}
        </div>
      </section>

      {/* Featured — quick links to products */}
      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <span className={styles.sectionLabel}>Featured</span>
        </div>
        <div className={styles.featuredList}>
          {FEATURED.map((item) => (
            <a key={item.name} href={item.href} className={styles.featuredItem}>
              <div className={styles.featuredSwatch} aria-hidden="true" />
              <div className={styles.featuredMeta}>
                <span className={styles.featuredName}>{item.name}</span>
                <span className={styles.featuredCat}>{item.category}</span>
              </div>
              <span className={styles.featuredPrice}>{item.price}</span>
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}
