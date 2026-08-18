import type { ReactNode } from "react";
import styles from "./landing.module.css";

/** Strip wrapping `[ … ]` from content strings so brackets can be styled separately. */
export function stripBrackets(text: string): string {
  return text.replace(/^\[\s*/, "").replace(/\s*\]$/, "");
}

/**
 * Renders `[ label ]` with orange brackets and brown (inherited) inner text.
 */
export function BracketedText({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span className={className}>
      <span className={styles.bracketMark} aria-hidden="true">
        [
      </span>{" "}
      {children}{" "}
      <span className={styles.bracketMark} aria-hidden="true">
        ]
      </span>
    </span>
  );
}
