const DEFAULT_TITLES = new Set(["New conversation", "New chat"]);

const OPENER =
  /^(hey[,!\s]+|hi[,!\s]+|hello[,!\s]+|please\s+|can you\s+|could you\s+|would you\s+|i(?:'m| am)?\s+(?:looking for|trying to|want(?:ing)? to|need to|need|want)\s+|help me\s+(?:to\s+)?|tell me\s+(?:about\s+)?|what(?:'s| is)\s+)/i;

const SMALL = new Set([
  "a",
  "an",
  "the",
  "and",
  "or",
  "of",
  "for",
  "to",
  "in",
  "with",
]);

function looksLikeTranscript(title: string): boolean {
  const text = title.trim();
  if (!text || DEFAULT_TITLES.has(text)) return true;
  if (
    /^(i |i'm |i’m |can you|could you|please |help me|what |how )/i.test(text)
  ) {
    return true;
  }
  if (text.endsWith("?")) return true;
  return text.length >= 50;
}

/** True when the stored title is a default or a raw copy of the first user line. */
export function needsGeneratedTitle(
  stored: string,
  userContent: string,
): boolean {
  if (looksLikeTranscript(stored)) return true;
  const user = userContent.replace(/\s+/g, " ").trim();
  if (!user) return false;
  if (stored.trim() === user.slice(0, 60) && user.length > 60) return true;
  return (
    user.startsWith(stored.trim()) &&
    stored.trim().length >= 24 &&
    user.length > stored.trim().length + 8
  );
}

/**
 * Short topic label for a thread — not a transcript of the first message.
 */
export function summarizeConversationTitle(raw: string): string {
  let text = raw.replace(/\s+/g, " ").trim();
  for (let i = 0; i < 4; i += 1) {
    const next = text.replace(OPENER, "").trim();
    if (next === text) break;
    text = next;
  }
  text = text.replace(/^(to|for|a|an|the)\s+/i, "").trim();
  text = (text.split(/[.?!]/)[0] ?? text).replace(/[,:;].*$/, "").trim();

  const words = text.split(/\s+/).filter(Boolean).slice(0, 6);
  if (words.length === 0) return "Interior chat";

  const titled = words
    .map((word, index) => {
      const cleaned = word.replace(/[^a-z0-9'/-]/gi, "");
      if (!cleaned) return "";
      const lower = cleaned.toLowerCase();
      if (index > 0 && SMALL.has(lower)) return lower;
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .filter(Boolean)
    .join(" ");

  return titled.slice(0, 48) || "Interior chat";
}

export function displayConversationTitle(
  stored: string,
  preview?: string | null,
): string {
  if (looksLikeTranscript(stored)) {
    return summarizeConversationTitle(preview?.trim() || stored);
  }
  if (preview && needsGeneratedTitle(stored, preview)) {
    return summarizeConversationTitle(preview);
  }
  return stored;
}
