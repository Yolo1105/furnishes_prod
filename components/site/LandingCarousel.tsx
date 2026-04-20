"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { LandingHeroCopy } from "@/components/site/LandingHeroCopy";
import {
  LANDING_FADE_MS,
  LANDING_ROTATE_MS,
} from "@/content/site/landing-carousel-config";

type LandingCarouselProps = {
  images: readonly string[];
};

const firstSlideIntroStyle = (ready: boolean) =>
  ({
    opacity: ready ? 1 : 0,
    transform: ready ? "scale(1.07)" : "scale(1)",
    transformOrigin: "center center",
    transition: `opacity ${LANDING_FADE_MS}ms ease-out, transform ${LANDING_FADE_MS}ms ease-out`,
  }) as const;

/** Darkens the upper area of hero imagery (below copy / header in z-order). */
function LandingTopScrim() {
  return (
    <div
      className="pointer-events-none absolute inset-x-0 top-0 z-[5] h-[min(52vh,520px)] bg-gradient-to-b from-black/60 via-black/25 to-transparent"
      aria-hidden
    />
  );
}

export function LandingCarousel({ images }: LandingCarouselProps) {
  const [active, setActive] = useState(0);
  const [firstImageReady, setFirstImageReady] = useState(false);
  const multi = images.length > 1;

  useEffect(() => {
    if (!multi || !firstImageReady) return;
    const id = window.setInterval(() => {
      setActive((i) => (i + 1) % images.length);
    }, LANDING_ROTATE_MS);
    return () => window.clearInterval(id);
  }, [images.length, multi, firstImageReady]);

  if (!multi) {
    const src = images[0];
    return (
      <div className="relative min-h-[100dvh] w-full overflow-hidden">
        <Image
          src={src}
          alt=""
          fill
          priority
          unoptimized
          className="object-cover object-center"
          sizes="100vw"
          quality={100}
          onLoad={() => setFirstImageReady(true)}
          style={firstSlideIntroStyle(firstImageReady)}
        />
        <LandingTopScrim />
        <LandingHeroCopy />
      </div>
    );
  }

  return (
    <div className="relative min-h-[100dvh] w-full overflow-hidden">
      <LandingHeroCopy />
      {images.map((src, i) => (
        <div
          key={src}
          className="pointer-events-none absolute inset-0 overflow-hidden"
          style={{
            opacity: active === i ? 1 : 0,
            transition: `opacity ${LANDING_FADE_MS}ms ease-in-out`,
            zIndex: active === i ? 2 : 1,
          }}
          aria-hidden
        >
          <Image
            src={src}
            alt=""
            fill
            priority
            unoptimized
            className="object-cover object-center"
            sizes="100vw"
            quality={100}
            onLoad={i === 0 ? () => setFirstImageReady(true) : undefined}
            style={i === 0 ? firstSlideIntroStyle(firstImageReady) : undefined}
          />
        </div>
      ))}
      <LandingTopScrim />
    </div>
  );
}
