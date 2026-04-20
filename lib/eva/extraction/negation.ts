/**
 * Negation detection and handling for preference extraction.
 * Detects when users express what they DON'T want. Ported from V1 negation_handler.py.
 */

export type NegationType =
  | "explicit_not"
  | "avoid"
  | "exclusion"
  | "retraction"
  | "over_statement";

export interface NegationResult {
  hasNegation: boolean;
  negatedTerms: string[];
  negationType: NegationType | null;
  negatedFields: string[];
  confidence: number;
  exceptionContext: Record<string, string>;
}

const EXPLICIT_NOT_PATTERNS = [
  /\bnot\s+(?:too\s+)?([a-z\s]+?)(?:\s|$|,|\.)/g,
  /\bno\s+([a-z\s]+?)(?:\s|$|,|\.)/g,
  /\bnothing\s+(?:too\s+)?([a-z\s]+?)(?:\s|$|,|\.)/g,
  /\bno\s+more\s+([a-z\s]+?)(?:\s|$|,|\.)/g,
];
const AVOID_PATTERNS = [
  /\bavoid\s+([a-z\s]+?)(?:\s|$|,|\.)/g,
  /\bskip\s+(?:the\s+)?([a-z\s]+?)(?:\s|$|,|\.)/g,
  /\bexclude\s+([a-z\s]+?)(?:\s|$|,|\.)/g,
  /\bdon'?t\s+want\s+([a-z\s]+?)(?:\s|$|,|\.)/g,
  /\bdo\s+not\s+want\s+([a-z\s]+?)(?:\s|$|,|\.)/g,
];
const OVER_PATTERNS = [
  /\b(?:i'?m|i am|we'?re|we are)\s+(?:so\s+)?(?:over|done with|tired of)\s+([a-z\s]+?)(?:\s|$|,|\.)/g,
  /\b(?:so\s+)?(?:over|done with)\s+([a-z\s]+?)(?:\s|$|,|\.)/g,
];
const RETRACTION_PATTERNS = [
  /\bforget\s+(?:about\s+)?([a-z\s]+?)(?:\s|$|,|\.)/g,
  /\bnever\s+mind\s+(?:about\s+)?(?:the\s+)?([a-z\s]+?)(?:\s|$|,|\.)/g,
  /\bactually,?\s+(?:no|not|skip|forget)\s+([a-z\s]+?)(?:\s|$|,|\.)/g,
];
const ANYTHING_BUT_PATTERNS = [
  /\banything\s+but\s+([a-z\s]+?)(?:\s|$|,|\.)/g,
  /\beverything\s+except\s+([a-z\s]+?)(?:\s|$|,|\.)/g,
  /\ball\s+but\s+([a-z\s]+?)(?:\s|$|,|\.)/g,
];
const EXCEPTION_PATTERNS = [
  /\b(?:no|not|avoid|without)\s+([a-z\s]+?)\s+except\s+(?:for\s+)?(?:an?\s+)?([a-z\s]+?)(?:\s|$|,|\.)/g,
  /\b(?:don'?t\s+want|avoid)\s+([a-z\s]+?)\s+but\s+([a-z\s]+?)\s+(?:is\s+)?(?:ok|fine)(?:\s|$|,|\.)/g,
  /\bexcept\s+(?:for\s+)?(?:an?\s+)?([a-z\s]+?)(?:\s|$|,|\.)/g,
];

function runPatterns(
  messageLower: string,
  patternTuples: [RegExp[], NegationType][],
): { terms: string[]; type: NegationType | null; confidence: number } {
  const terms = new Set<string>();
  let type: NegationType | null = null;
  let confidence = 0;
  for (const [patterns, negType] of patternTuples) {
    for (const re of patterns) {
      const copy = new RegExp(re.source, re.flags);
      let m: RegExpExecArray | null;
      while ((m = copy.exec(messageLower)) !== null) {
        const term = m[1]
          .trim()
          .replace(/\s+(style|design|color|furniture|room|etc\.?)$/i, "");
        if (term.length > 2) {
          terms.add(term);
          if (!type) type = negType;
          const c =
            negType === "retraction" || negType === "over_statement"
              ? 0.9
              : 0.7;
          if (c > confidence) confidence = c;
        }
      }
    }
  }
  return { terms: [...terms], type, confidence };
}

/**
 * Detect negation patterns in user message.
 */
export function detectNegations(message: string): NegationResult {
  const result: NegationResult = {
    hasNegation: false,
    negatedTerms: [],
    negationType: null,
    negatedFields: [],
    confidence: 0,
    exceptionContext: {},
  };
  const messageLower = message.toLowerCase();

  const patternTuples: [RegExp[], NegationType][] = [
    [EXPLICIT_NOT_PATTERNS, "explicit_not"],
    [AVOID_PATTERNS, "avoid"],
    [OVER_PATTERNS, "over_statement"],
    [RETRACTION_PATTERNS, "retraction"],
    [ANYTHING_BUT_PATTERNS, "exclusion"],
  ];
  const { terms, type, confidence } = runPatterns(messageLower, patternTuples);
  if (terms.length > 0) {
    result.hasNegation = true;
    result.negatedTerms = terms;
    result.negationType = type;
    result.confidence = confidence;
    const mapped = mapNegatedTermsToFields(terms);
    result.negatedFields = Object.keys(mapped).filter(
      (k) => mapped[k].length > 0,
    );
  }

  for (const re of EXCEPTION_PATTERNS) {
    const copy = new RegExp(re.source, re.flags);
    const match = copy.exec(messageLower);
    if (match) {
      const groups = match.slice(1).filter(Boolean);
      if (groups.length >= 2) {
        const negated = groups[0].trim();
        const exception = groups[1].trim();
        if (negated.length > 1 && exception.length > 1)
          result.exceptionContext[negated] = exception;
      } else if (groups.length === 1 && result.negatedTerms.length > 0) {
        result.exceptionContext[
          result.negatedTerms[result.negatedTerms.length - 1]
        ] = groups[0].trim();
      }
    }
  }
  return result;
}

const STYLE_KEYWORDS = new Set([
  "modern",
  "traditional",
  "minimalist",
  "scandinavian",
  "industrial",
  "bohemian",
  "contemporary",
  "vintage",
  "rustic",
  "farmhouse",
  "mid-century",
  "art deco",
  "japanese",
  "mediterranean",
  "coastal",
  "transitional",
  "glam",
  "maximalist",
  "eclectic",
]);
const COLOR_KEYWORDS = new Set([
  "blue",
  "green",
  "red",
  "yellow",
  "purple",
  "pink",
  "orange",
  "brown",
  "gray",
  "grey",
  "white",
  "black",
  "beige",
  "cream",
  "navy",
  "maroon",
  "teal",
  "turquoise",
  "neutral",
  "warm",
  "cool",
  "sage",
  "charcoal",
  "ivory",
  "taupe",
]);
const FURNITURE_KEYWORDS = new Set([
  "sofa",
  "couch",
  "bed",
  "table",
  "chair",
  "desk",
  "dresser",
  "nightstand",
  "lamp",
  "rug",
  "curtain",
  "shelf",
  "cabinet",
]);

/**
 * Map negated terms to preference fields. Returns dict mapping field names to list of negated values.
 * V3 fields: style, color, furniture, roomType, budget, exclusion.
 */
export function mapNegatedTermsToFields(
  negatedTerms: string[],
): Record<string, string[]> {
  const result: Record<string, string[]> = {
    style: [],
    color: [],
    furniture: [],
  };
  for (const term of negatedTerms) {
    const termLower = term.toLowerCase();
    for (const style of STYLE_KEYWORDS) {
      if (termLower.includes(style)) {
        result.style.push(style);
        break;
      }
    }
    for (const color of COLOR_KEYWORDS) {
      if (termLower.includes(color)) {
        result.color.push(color);
        break;
      }
    }
    for (const furniture of FURNITURE_KEYWORDS) {
      if (termLower.includes(furniture)) {
        result.furniture.push(furniture);
        break;
      }
    }
  }
  return Object.fromEntries(
    Object.entries(result).filter(([, v]) => v.length > 0),
  );
}
