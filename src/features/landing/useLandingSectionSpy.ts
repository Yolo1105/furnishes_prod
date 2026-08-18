"use client";

import { useEffect, useState } from "react";
import { landingSideNav } from "./landing-navigation";

/** Active side-nav id based on scroll midpoint (matches the frozen reference). */
export function useLandingSectionSpy() {
  const [activeSection, setActiveSection] = useState("home");

  useEffect(() => {
    const spyOrder = landingSideNav.flatMap((item) =>
      item.group.map((sec) => ({ sec, nav: item.id })),
    );
    let tops: { nav: string; top: number }[] = [];
    const measure = () => {
      const next: { nav: string; top: number }[] = [];
      for (const { sec, nav } of spyOrder) {
        const el = document.getElementById(sec);
        if (!el) continue;
        next.push({
          nav,
          top: el.getBoundingClientRect().top + window.scrollY,
        });
      }
      tops = next;
    };
    let raf = 0;
    const compute = () => {
      raf = 0;
      const line = window.scrollY + window.innerHeight * 0.5;
      let cur = "home";
      for (const t of tops) if (line >= t.top) cur = t.nav;
      setActiveSection((a) => (a === cur ? a : cur));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(compute);
    };
    const remeasure = () => {
      measure();
      onScroll();
    };
    measure();
    compute();
    const t1 = window.setTimeout(remeasure, 600);
    const t2 = window.setTimeout(remeasure, 2200);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", remeasure);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", remeasure);
    };
  }, []);

  return activeSection;
}
