"use client";

import { useEffect, useState } from "react";
import {
  INTERIOR_HERO_SLIDE_MS,
  INTERIOR_HERO_SLIDES,
} from "@/lib/interior-hero-slides";

export function QuizBgSlides() {
  const [index, setIndex] = useState(0);
  const [reduce, setReduce] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduce(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (reduce) return;
    const id = window.setInterval(() => {
      setIndex((current) => (current + 1) % INTERIOR_HERO_SLIDES.length);
    }, INTERIOR_HERO_SLIDE_MS);
    return () => window.clearInterval(id);
  }, [reduce]);

  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 0,
        overflow: "hidden",
        pointerEvents: "none",
      }}
    >
      {INTERIOR_HERO_SLIDES.map((src, i) => (
        <img
          key={src}
          src={src}
          alt=""
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "center",
            opacity: i === index ? 1 : 0,
            transition: reduce ? "none" : "opacity 2.2s ease",
          }}
        />
      ))}
      {/* Keep cream type readable without flattening the rooms to a tint. */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(90deg, rgba(18,15,12,0.58) 0%, rgba(18,15,12,0.4) 42%, rgba(12,10,8,0.7) 100%), linear-gradient(180deg, rgba(18,15,12,0.55) 0%, rgba(18,15,12,0.45) 40%, rgba(12,10,8,0.8) 100%)",
        }}
      />
    </div>
  );
}
