type BracketedSectionLabelProps = {
  label: string;
  /** Extra classes for the label text between brackets (e.g. `font-medium`). */
  labelClassName?: string;
  /** Smaller type for dense layouts (e.g. about page section headers). */
  size?: "default" | "compact";
};

/** Accent brackets + primary label — shared by landing sections (About, Experience, etc.). */
export function BracketedSectionLabel({
  label,
  labelClassName,
  size = "default",
}: BracketedSectionLabelProps) {
  const textSize =
    size === "compact" ? "text-sm md:text-base" : "text-lg md:text-xl";
  const bracketScale = size === "compact" ? "text-[1.14em]" : "text-[1.16em]";

  return (
    <span className={`font-sans font-normal tracking-[0.02em] ${textSize}`}>
      <span
        className={`inline-block ${bracketScale} leading-none text-[var(--color-accent)]`}
      >
        [
      </span>
      <span
        className={`px-[0.38em] text-[var(--color-primary)] ${labelClassName ?? ""}`.trim()}
      >
        {label}
      </span>
      <span
        className={`inline-block ${bracketScale} leading-none text-[var(--color-accent)]`}
      >
        ]
      </span>
    </span>
  );
}
