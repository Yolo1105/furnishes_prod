"use client";

import { useState, useMemo } from "react";
import { CollectionProductCard } from "@/components/site/CollectionProductCard";
import {
  DEFAULT_SORT,
  getSimilarCollectionProducts,
  getMockProductComments,
  type CollectionProductComment,
} from "@/content/site/collection";
import {
  buildProductDetailHref,
  getDefaultListingQuickActive,
  type CollectionUrlState,
} from "@/lib/site/collection-navigation";
import styles from "./ProductDetailPage.module.css";

const defaultListingState: CollectionUrlState = {
  quickActive: getDefaultListingQuickActive(),
  sort: DEFAULT_SORT,
  q: "",
};

function StarRow({ rating }: { rating: number }) {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5 && full < 5;
  return (
    <span
      className={styles.commentStars}
      aria-label={`${rating} out of 5 stars`}
    >
      {[0, 1, 2, 3, 4].map((i) => {
        if (i < full) return <span key={i}>★</span>;
        if (half && i === full)
          return (
            <span key={i} className={styles.commentStarHalf}>
              ★
            </span>
          );
        return (
          <span key={i} className={styles.commentStarDim}>
            ★
          </span>
        );
      })}
    </span>
  );
}

function CommentCard({ c }: { c: CollectionProductComment }) {
  return (
    <article className={styles.commentCard}>
      <div className={styles.commentCardHead}>
        <div>
          <p className={styles.commentAuthor}>{c.author}</p>
          <p className={styles.commentMeta}>
            <StarRow rating={c.rating} />
            <span className={styles.commentDate}>{c.date}</span>
          </p>
        </div>
      </div>
      <h3 className={styles.commentTitle}>{c.title}</h3>
      <p className={styles.commentBody}>{c.body}</p>
    </article>
  );
}

export function ProductDetailBottom({ productId }: { productId: number }) {
  const similar = useMemo(
    () => getSimilarCollectionProducts(productId, 4),
    [productId],
  );
  const comments = useMemo(
    () => getMockProductComments(productId),
    [productId],
  );
  const [draft, setDraft] = useState("");

  return (
    <div className={styles.detailBottom}>
      <section
        className={styles.detailBottomSection}
        aria-labelledby="similar-heading"
      >
        <div className={styles.detailBottomHeader}>
          <h2 id="similar-heading" className={styles.detailBottomTitle}>
            Similar items
          </h2>
          <p className={styles.detailBottomSubtitle}>
            More pieces from this category and nearby edits.
          </p>
        </div>
        <div className={styles.similarGrid}>
          {similar.map((p, i) => (
            <CollectionProductCard
              key={p.id}
              product={p}
              delay={i * 60}
              listingHref={buildProductDetailHref(p.id, defaultListingState)}
            />
          ))}
        </div>
      </section>

      <section
        className={styles.detailBottomSection}
        aria-labelledby="comments-heading"
      >
        <div className={styles.detailBottomHeader}>
          <h2 id="comments-heading" className={styles.detailBottomTitle}>
            Comments & reviews
          </h2>
          <p className={styles.detailBottomSubtitle}>
            Verified-style feedback from shoppers (demo content).
          </p>
        </div>

        <ul className={styles.commentList}>
          {comments.map((c) => (
            <li key={c.id}>
              <CommentCard c={c} />
            </li>
          ))}
        </ul>

        <div className={styles.commentComposer}>
          <label
            htmlFor="pdp-review-draft"
            className={styles.commentComposerLabel}
          >
            Write a comment
          </label>
          <textarea
            id="pdp-review-draft"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
            placeholder="Share how this piece fits your space…"
            className={styles.commentTextarea}
          />
          <button type="button" className={styles.commentSubmit} disabled>
            Post comment
          </button>
          <p className={styles.commentComposerHint}>
            Posting will be enabled when reviews go live.
          </p>
        </div>
      </section>
    </div>
  );
}
