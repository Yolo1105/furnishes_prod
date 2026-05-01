"use client";

import React, { useEffect, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ProductDetailAccordion } from "./ProductDetailAccordion";
import { ProductTrustSignals } from "./ProductTrustSignals";
import { ProductDetailBottom } from "./ProductDetailBottom";
import type { CollectionProductDetail } from "@/content/site/collection";
import { buildRoomFilteredListingHref } from "@/lib/site/collection-navigation";
import styles from "./ProductDetailPage.module.css";

/** Single path reused for filled / stroked star SVGs in `renderStars`. */
const STAR_PATH_D =
  "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z";

function renderStars(rating: number) {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  return (
    <div className={styles.stars}>
      {[...Array(5)].map((_, i) => {
        if (i < fullStars) {
          return (
            <svg
              key={i}
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden
            >
              <path d={STAR_PATH_D} />
            </svg>
          );
        }
        if (i === fullStars && hasHalfStar) {
          return (
            <svg
              key={i}
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden
            >
              <path d={STAR_PATH_D} />
            </svg>
          );
        }
        return (
          <svg
            key={i}
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden
          >
            <path d={STAR_PATH_D} />
          </svg>
        );
      })}
    </div>
  );
}

export function ProductDetailView({
  product,
}: {
  product: CollectionProductDetail;
}) {
  const router = useRouter();
  const [selectedColor, setSelectedColor] = useState(
    product.colors[0]?.value ?? "",
  );
  const [selectedSize, setSelectedSize] = useState(product.sizes[0] ?? "");
  const [quantity, setQuantity] = useState(1);
  const [mainImage, setMainImage] = useState(0);
  const [addToCartSuccess, setAddToCartSuccess] = useState(false);
  const [adding, setAdding] = useState(false);
  const [cartError, setCartError] = useState<string | null>(null);

  const roomListingHref = buildRoomFilteredListingHref(product.room);

  useEffect(() => {
    if (!addToCartSuccess) return;
    const timer = window.setTimeout(() => setAddToCartSuccess(false), 3000);
    return () => window.clearTimeout(timer);
  }, [addToCartSuccess]);

  const updateQuantity = (change: number) => {
    setQuantity((prev) => Math.max(1, Math.min(10, prev + change)));
  };

  const handleAddToCart = async () => {
    setCartError(null);
    setAdding(true);
    try {
      const unitPriceCents = Math.round(product.price * 100);
      const res = await fetch("/api/cart/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: String(product.id),
          variantId: `${selectedColor}|${selectedSize}`,
          qty: quantity,
          unitPriceCents,
        }),
      });
      const data = (await res.json()) as { message?: string; error?: string };
      if (res.status === 401) {
        router.push(`/login?next=/collections/${product.id}`);
        return;
      }
      if (!res.ok) {
        setCartError(
          typeof data.message === "string"
            ? data.message
            : (data.error ?? "Could not add to cart"),
        );
        return;
      }
      setAddToCartSuccess(true);
    } finally {
      setAdding(false);
    }
  };

  const accordionSections: {
    id: string;
    title: string;
    defaultOpen: boolean;
    render: () => ReactNode;
  }[] = [
    {
      id: "description",
      title: "Description",
      defaultOpen: true,
      render: () => <p>{product.fullDescription}</p>,
    },
    {
      id: "dimensions",
      title: "Dimensions",
      defaultOpen: true,
      render: () => (
        <table className={styles.dimensionsTable}>
          <tbody>
            <tr>
              <td>Height (A)</td>
              <td>{product.dimensions.height}</td>
            </tr>
            <tr>
              <td>Width (B)</td>
              <td>{product.dimensions.width}</td>
            </tr>
            <tr>
              <td>Depth (C)</td>
              <td>{product.dimensions.depth}</td>
            </tr>
            <tr>
              <td>Seat Height</td>
              <td>{product.dimensions.seatHeight}</td>
            </tr>
            <tr>
              <td>Seat Depth</td>
              <td>{product.dimensions.seatDepth}</td>
            </tr>
            <tr>
              <td>Weight</td>
              <td>{product.dimensions.weight}</td>
            </tr>
          </tbody>
        </table>
      ),
    },
    {
      id: "materials",
      title: "Materials",
      defaultOpen: false,
      render: () => (
        <div className={styles.materialList}>
          {product.materials.map((m, index) => (
            <div key={index} className={styles.materialItem}>
              <span>{m.name}</span>
              <span>{m.value}</span>
            </div>
          ))}
        </div>
      ),
    },
    {
      id: "delivery",
      title: "Delivery",
      defaultOpen: false,
      render: () => <p>{product.delivery}</p>,
    },
    {
      id: "care",
      title: "Care",
      defaultOpen: false,
      render: () => <p>{product.care}</p>,
    },
    {
      id: "warranty",
      title: "Warranty",
      defaultOpen: false,
      render: () => <p>{product.warranty}</p>,
    },
  ];

  return (
    <div className={styles.detailPage}>
      <div className={`${styles.detailContainer} ${styles.detailHeroBand}`}>
        <div className={styles.detailCenter}>
          <div className={styles.detailCenterHeader}>
            <div className={styles.detailTitleRow}>
              <h1 className={styles.detailTitle}>{product.name}</h1>
            </div>
            <p className={styles.detailSubtitle}>by {product.brand}</p>
            <div className={styles.detailRating}>
              {renderStars(product.rating)}
              <span>({product.reviewCount} reviews)</span>
            </div>
          </div>
          <div className={styles.mainImage}>
            <Image
              src={product.images[mainImage]}
              alt={product.name}
              fill
              priority={mainImage === 0}
              className={styles.mainImageImg}
              sizes="(max-width: 1200px) 100vw, 980px"
            />
          </div>
          <div className={styles.thumbnailRow}>
            {product.images.map((img, index) => (
              <button
                key={index}
                type="button"
                className={`${styles.thumbnail} ${mainImage === index ? styles.active : ""}`}
                onClick={() => setMainImage(index)}
                aria-label={`View image ${index + 1}`}
              >
                <Image
                  src={img}
                  alt={`${product.name} view ${index + 1}`}
                  fill
                  className={styles.thumbnailImg}
                  sizes="96px"
                />
              </button>
            ))}
          </div>
        </div>

        <div className={styles.detailLeft}>
          {accordionSections.map((section) => (
            <ProductDetailAccordion
              key={section.id}
              title={section.title}
              defaultOpen={section.defaultOpen}
            >
              {section.render()}
            </ProductDetailAccordion>
          ))}
        </div>

        <div className={styles.detailRight}>
          <p className={styles.detailRef}>REF: {product.ref}</p>
          <Link
            href={roomListingHref}
            className={styles.detailRightIntroLink}
            aria-label={`Back to ${product.room} collection`}
          >
            <p className={styles.detailDescription}>{product.description}</p>
            <p className={styles.detailDescription}>{product.additionalInfo}</p>
          </Link>

          <div className={styles.variantSection}>
            <div className={styles.variantLabel}>
              Color
              <span className={styles.variantValue}>
                {product.colors.find((c) => c.value === selectedColor)?.name ??
                  product.colors[0]?.name ??
                  ""}
              </span>
            </div>
            <div className={styles.detailSwatches}>
              {product.colors.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  className={`${styles.detailSwatch} ${selectedColor === color.value ? styles.selected : ""}`}
                  style={{ background: color.value }}
                  onClick={() => setSelectedColor(color.value)}
                  aria-label={`Color ${color.name}`}
                />
              ))}
            </div>
          </div>

          <div className={styles.variantSection}>
            <div className={styles.variantLabel}>Size</div>
            <div className={styles.sizeOptions}>
              {product.sizes.map((size) => (
                <button
                  key={size}
                  type="button"
                  className={`${styles.sizeOption} ${selectedSize === size ? styles.selected : ""}`}
                  onClick={() => setSelectedSize(size)}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          <p className={styles.detailPrice}>
            ${product.price.toLocaleString()}
          </p>
          <p className={styles.detailFinancing}>
            or ${Math.round(product.price / 24)}/mo with Affirm
          </p>

          <div className={styles.quantitySelector}>
            <button
              type="button"
              className={styles.qtyBtn}
              onClick={() => updateQuantity(-1)}
              aria-label="Decrease quantity"
            >
              −
            </button>
            <span className={styles.qtyValue}>{quantity}</span>
            <button
              type="button"
              className={styles.qtyBtn}
              onClick={() => updateQuantity(1)}
              aria-label="Increase quantity"
            >
              +
            </button>
          </div>

          <button
            type="button"
            disabled={adding}
            data-testid="add-to-cart"
            className={`${styles.addToCart} ${addToCartSuccess ? styles.addToCartSuccess : ""}`}
            onClick={() => void handleAddToCart()}
          >
            {adding
              ? "Adding…"
              : addToCartSuccess
                ? "Added to Cart"
                : "Add to Cart"}
          </button>
          {cartError && (
            <p className={styles.detailFinancing} role="alert">
              {cartError}
            </p>
          )}

          <ProductTrustSignals />
        </div>
      </div>

      <ProductDetailBottom productId={product.id} />
    </div>
  );
}
