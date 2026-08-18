"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

/**
 * Top → bottom index autoplay for Studio / Teams. Pauses while the section is
 * off-screen or until `pauseMs` after a manual selection.
 */
export function useSequentialAutoplay(
  count: number,
  intervalMs: number,
  sectionRef: RefObject<HTMLElement | null>,
) {
  const [activeIndex, setActiveIndex] = useState(0);
  const inViewRef = useRef(false);
  const pauseUntilRef = useRef(0);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el || !("IntersectionObserver" in window)) {
      inViewRef.current = true;
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        inViewRef.current = Boolean(entry?.isIntersecting);
      },
      { threshold: 0.2 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [sectionRef]);

  useEffect(() => {
    if (count <= 1) return;
    const id = window.setInterval(() => {
      if (!inViewRef.current) return;
      if (Date.now() < pauseUntilRef.current) return;
      setActiveIndex((i) => (i + 1 >= count ? 0 : i + 1));
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [count, intervalMs]);

  const selectIndex = (index: number, pauseMs = 6000) => {
    setActiveIndex(index);
    pauseUntilRef.current = Date.now() + pauseMs;
  };

  const pauseBriefly = (pauseMs = 1200) => {
    pauseUntilRef.current = Date.now() + pauseMs;
  };

  return { activeIndex, selectIndex, pauseBriefly };
}
