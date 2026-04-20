import type { ReactNode } from "react";

/** Orange horizontal rule shared by collections, inspiration, and about intros — width from `globals.css`. */
export function PageHeaderAccentRule({
  className = "",
}: {
  className?: string;
}) {
  return (
    <div
      className={`box-border [height:var(--page-header-accent-rule-height)] [width:var(--page-header-accent-rule-width)] max-w-full flex-none self-start bg-[var(--color-page-header-accent)] ${className}`.trim()}
      aria-hidden
    />
  );
}

type PageHeaderProps = {
  /** Eyebrow line (e.g. mixed black + accent spans). Omit when using `headline` only. */
  tag?: ReactNode;
  /** Placed after the tag line and before the headline (e.g. directory / breadcrumb trail). */
  preHeadlineSlot?: ReactNode;
  /** Large display title (uppercase h1). Ignored when `headline` is set. */
  title?: string;
  /** About-style single line (e.g. colon headline). Replaces `title` + `subtitle` when set. */
  headline?: ReactNode;
  /** Optional line under the main title (left column). */
  subtitle?: ReactNode;
  /** Rendered in the left column directly under the title (e.g. filter tabs). */
  belowTitleSlot?: ReactNode;
  description?: ReactNode;
  /** Optional right column content (e.g. filter buttons) */
  rightSlot?: ReactNode;
  /** Tailwind gap classes between description and `rightSlot` (default: gap-8 md:gap-10) */
  descriptionToRightSlotGapClassName?: string;
  /** Max width for the description + rightSlot column (default: max-w-xl xl:max-w-md) */
  rightColumnMaxWidthClassName?: string;
  className?: string;
  /**
   * `start` (default): top-align columns so the tag line lines up with the description.
   * `end`: bottom-align on large screens (magazine-style); can feel offset next to a very tall title.
   */
  columnAlign?: "start" | "end";
};

export function PageHeader({
  tag,
  preHeadlineSlot,
  title,
  headline,
  subtitle,
  belowTitleSlot,
  description,
  rightSlot,
  descriptionToRightSlotGapClassName = "gap-8 md:gap-10",
  rightColumnMaxWidthClassName = "max-w-xl xl:max-w-md",
  className = "",
  columnAlign = "start",
}: PageHeaderProps) {
  const rowAlign =
    columnAlign === "end"
      ? "items-start xl:items-end"
      : "items-start xl:items-start";
  const rightColumnPt = columnAlign === "end" ? "" : "xl:pt-0.5";
  return (
    <header
      className={`flex flex-col justify-between px-0 pt-0 pb-0 font-sans md:pt-0 md:pb-1 xl:flex-row ${rowAlign} gap-8 xl:gap-20 ${className}`.trim()}
    >
      <div
        className={`min-w-0 shrink ${headline != null ? "max-w-5xl xl:max-w-6xl" : "max-w-4xl"}`}
      >
        {headline != null ? (
          <div
            className={`flex w-full flex-col font-sans ${tag != null || preHeadlineSlot != null ? "gap-3" : ""}`}
          >
            {tag}
            {preHeadlineSlot}
            <div className="w-full min-w-0">{headline}</div>
            {belowTitleSlot}
          </div>
        ) : (
          <>
            {tag != null ? (
              <div className="mb-5 font-sans md:mb-6">{tag}</div>
            ) : null}
            {title != null && title !== "" ? (
              <h1 className="text-primary font-sans text-4xl leading-[0.8] font-[375] tracking-tighter uppercase md:text-6xl lg:text-7xl">
                {title}
              </h1>
            ) : null}
            {subtitle != null ? (
              <div className="mt-3 max-w-2xl md:mt-4">{subtitle}</div>
            ) : null}
            {belowTitleSlot}
          </>
        )}
      </div>
      {(description != null || rightSlot) && (
        <div
          className={`flex w-full min-w-0 flex-col items-end text-right xl:shrink-0 ${rightColumnPt} ${rightColumnMaxWidthClassName} ${descriptionToRightSlotGapClassName}`.trim()}
        >
          {description != null && (
            <div className="text-primary/70 w-full font-sans text-base leading-relaxed font-light [text-wrap:balance] md:text-xl">
              {description}
            </div>
          )}
          {rightSlot}
        </div>
      )}
    </header>
  );
}
