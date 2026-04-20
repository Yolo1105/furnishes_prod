"use client";

import { useInView } from "framer-motion";
import { useRef } from "react";

export function useAwardsSection() {
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, {
    once: true,
    amount: 0.1,
  });
  return { ref, isInView };
}
