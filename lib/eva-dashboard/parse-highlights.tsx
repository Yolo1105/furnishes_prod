"use client";

/**
 * Finds non-overlapping <hl>...</hl> ranges (outermost only; nesting is handled by recursion in parseHighlightedContent).
 */
function findHighlightRanges(
  text: string,
): Array<{ start: number; end: number }> {
  const ranges: Array<{ start: number; end: number }> = [];
  const openTag = "<hl>";
  const closeTag = "</hl>";
  let i = 0;
  while (i < text.length) {
    const openIdx = text.indexOf(openTag, i);
    if (openIdx === -1) break;
    let depth = 1;
    let j = openIdx + openTag.length;
    while (j < text.length && depth > 0) {
      const nextOpen = text.indexOf(openTag, j);
      const nextClose = text.indexOf(closeTag, j);
      if (nextClose === -1) break;
      if (nextOpen !== -1 && nextOpen < nextClose) {
        depth++;
        j = nextOpen + openTag.length;
      } else {
        depth--;
        if (depth === 0) {
          ranges.push({ start: openIdx, end: nextClose + closeTag.length });
          i = nextClose + closeTag.length;
          break;
        }
        j = nextClose + closeTag.length;
      }
    }
    if (depth !== 0) i = openIdx + 1;
  }
  return ranges;
}

export function parseHighlightedContent(text: string) {
  const ranges = findHighlightRanges(text);
  if (ranges.length === 0) return [<span key={0}>{text}</span>];
  const parts: Array<{ type: "text" | "hl"; value: string }> = [];
  let lastEnd = 0;
  for (const { start, end } of ranges) {
    if (start > lastEnd) {
      parts.push({ type: "text", value: text.slice(lastEnd, start) });
    }
    parts.push({
      type: "hl",
      value: text.slice(start + "<hl>".length, end - "</hl>".length),
    });
    lastEnd = end;
  }
  if (lastEnd < text.length) {
    parts.push({ type: "text", value: text.slice(lastEnd) });
  }
  return parts.map((p, i) =>
    p.type === "hl" ? (
      <span
        key={i}
        className="bg-primary/15 text-primary rounded px-1 py-0.5 text-sm font-semibold"
      >
        {parseHighlightedContent(p.value)}
      </span>
    ) : (
      <span key={i}>{p.value}</span>
    ),
  );
}
