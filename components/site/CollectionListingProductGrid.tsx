"use client";

import type { CollectionProduct } from "@/content/site/collection";
import {
  buildProductDetailHref,
  type CollectionUrlState,
} from "@/lib/site/collection-navigation";
import { CollectionProductCard } from "@/components/site/CollectionProductCard";
import styles from "./CollectionFilter.module.css";

export function CollectionListingProductGrid({
  view,
  sortedProducts,
  urlState,
}: {
  view: "editorial" | "grid";
  sortedProducts: CollectionProduct[];
  urlState: CollectionUrlState;
}) {
  if (view === "editorial") {
    return (
      <div className={styles.editorialCol}>
        {Array.from({ length: Math.ceil(sortedProducts.length / 5) }).map(
          (_, rowIdx) => {
            const base = rowIdx * 5;
            const hero = sortedProducts[base];
            const small = sortedProducts.slice(base + 1, base + 5);
            const heroLeft = rowIdx % 2 === 0;
            return (
              <div key={rowIdx} className={styles.editorialRow}>
                {heroLeft && hero && (
                  <CollectionProductCard
                    product={hero}
                    hero
                    delay={0}
                    listingHref={buildProductDetailHref(hero.id, urlState)}
                  />
                )}
                <div className={styles.editorialQuad}>
                  {small.map((p, i) =>
                    p ? (
                      <CollectionProductCard
                        key={p.id}
                        product={p}
                        delay={i * 80}
                        listingHref={buildProductDetailHref(p.id, urlState)}
                      />
                    ) : null,
                  )}
                </div>
                {!heroLeft && hero && (
                  <CollectionProductCard
                    product={hero}
                    hero
                    delay={0}
                    listingHref={buildProductDetailHref(hero.id, urlState)}
                  />
                )}
              </div>
            );
          },
        )}
      </div>
    );
  }

  return (
    <div className={styles.gridOnly}>
      {sortedProducts.map((p, i) => (
        <CollectionProductCard
          key={p.id}
          product={p}
          priorityLoad={i === 0}
          delay={i * 50}
          listingHref={buildProductDetailHref(p.id, urlState)}
        />
      ))}
    </div>
  );
}
