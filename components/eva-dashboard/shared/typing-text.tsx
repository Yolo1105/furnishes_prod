"use client";

import { useState, useEffect, memo } from "react";

interface TypingTextProps {
  text: string;
  speed?: number;
}

export const TypingText = memo(function TypingText({
  text,
  speed = 90,
}: TypingTextProps) {
  const [length, setLength] = useState(0);
  useEffect(() => {
    if (length >= text.length) return;
    const t = setTimeout(() => setLength((n) => n + 1), speed);
    return () => clearTimeout(t);
  }, [length, text, speed]);

  return (
    <>
      <span>{text.slice(0, length)}</span>
      <span
        className="text-primary animate-cursor-blink ml-0.5 inline-block w-[1ch]"
        aria-hidden="true"
      >
        _
      </span>
    </>
  );
});
