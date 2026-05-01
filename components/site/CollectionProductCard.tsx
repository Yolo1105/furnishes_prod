"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { CollectionProduct } from "@/content/site/collection";
import styles from "./CollectionProductCard.module.css";

const SMALL_IMG = 210;
const TEXT_H = 54;
const GAP = 20;
const HERO_IMG = SMALL_IMG * 2 + GAP + TEXT_H;

export { SMALL_IMG, GAP, HERO_IMG };

function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold: 0.1 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return [ref, visible] as const;
}

export function CollectionProductCard({
  product,
  hero = false,
  priorityLoad = false,
  delay = 0,
  listingHref,
}: {
  product: CollectionProduct;
  hero?: boolean;
  /** Eager-fetch first grid images to reduce lazy-load intervention noise / improve LCP. */
  priorityLoad?: boolean;
  delay?: number;
  listingHref: string;
}) {
  const [hovered, setHovered] = useState(false);
  const [ripple, setRipple] = useState<{
    x: number;
    y: number;
    id: number;
  } | null>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [ref, visible] = useReveal();
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    setTilt({
      x: ((e.clientX - rect.left) / rect.width - 0.5) * 5,
      y: ((e.clientY - rect.top) / rect.height - 0.5) * -5,
    });
  };
  const handleMouseLeave = () => {
    setHovered(false);
    setTilt({ x: 0, y: 0 });
  };
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setRipple({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      id: Date.now(),
    });
    setTimeout(() => setRipple(null), 700);
  };

  const h = hero ? HERO_IMG : SMALL_IMG;

  return (
    <Link href={listingHref} className={styles.link}>
      <div
        ref={ref}
        data-testid="product-card"
        data-product-id={String(product.id)}
        className={`${styles.revealWrap} ${visible ? styles.revealWrapVisible : styles.revealWrapHidden}`}
        style={{
          transitionDelay: visible ? `${delay}ms` : undefined,
        }}
      >
        <div
          ref={cardRef}
          className={`${styles.cardSurface} ${!hovered ? styles.cardSurfaceTall : ""} ${hovered ? styles.cardShadowHover : ""}`}
          onMouseEnter={() => setHovered(true)}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onClick={handleClick}
          style={{
            height: h,
            transform: `perspective(900px) rotateX(${tilt.y}deg) rotateY(${tilt.x}deg) scale(${hovered ? 1.005 : 1})`,
            transition: hovered
              ? "transform 0.15s ease"
              : "transform 0.5s cubic-bezier(0.23,1,0.32,1)",
          }}
        >
          <Image
            src={product.image}
            alt={product.name}
            fill
            priority={hero || priorityLoad}
            sizes="(max-width: 640px) 100vw, (max-width: 1200px) 45vw, 520px"
            className={`${styles.image} ${hovered ? styles.imageHover : ""}`}
          />
          <div
            className={`${styles.gradientOverlay} ${hovered ? styles.gradientOverlayHover : styles.gradientOverlayIdle}`}
          >
            <span className={styles.quickViewLabel}>Quick View →</span>
          </div>
          {ripple && (
            <span
              key={ripple.id}
              className={styles.ripple}
              style={{
                left: ripple.x - 4,
                top: ripple.y - 4,
              }}
            />
          )}
        </div>
        <div
          className={`${styles.titleRow} ${hovered ? styles.titleRowHover : ""}`}
        >
          <p
            className={`${styles.productTitle} ${hero ? styles.productTitleHero : styles.productTitleSmall}`}
          >
            {product.name}
          </p>
          <p className={styles.brand}>{product.brand}</p>
        </div>
        <p className={styles.price}>${product.price.toLocaleString()}</p>
      </div>
    </Link>
  );
}
