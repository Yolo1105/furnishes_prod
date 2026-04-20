/**
 * Vocabulary expansion for slang, abbreviations, and non-standard terms.
 * Full canonical coverage: style, color, furniture. Case-insensitive key lookup.
 */
export const VOCABULARY_MAP: Record<string, string> = {
  // Style synonyms (19 canonical style tokens)
  mcm: "mid-century modern",
  "mcm furniture": "mid-century modern",
  "mid century": "mid-century modern",
  "mid-century": "mid-century modern",
  scandi: "scandinavian",
  japandi: "japandi",
  boho: "bohemian",
  "boho-chic": "bohemian",
  farmhouse: "farmhouse",
  glam: "hollywood glam",
  "wabi-sabi": "wabi-sabi",
  "art deco": "art deco",
  coastal: "coastal",
  "coastal grandmother": "coastal traditional",
  transitional: "transitional",
  eclectic: "eclectic",
  rustic: "rustic",
  cottagecore: "cottage",
  cluttercore: "maximalist eclectic",
  "dark academia": "traditional scholarly",
  maximal: "maximalist",
  maximalist: "maximalist",
  contemp: "contemporary",
  trad: "traditional",
  minimal: "minimalist",
  hygge: "scandinavian cozy",

  // Color synonyms (22+ tokens)
  navy: "navy blue",
  "navy blue": "navy blue",
  sage: "sage green",
  "sage green": "sage green",
  cream: "cream white",
  "cream white": "cream white",
  charcoal: "charcoal gray",
  "charcoal gray": "charcoal gray",
  blush: "blush pink",
  "blush pink": "blush pink",
  taupe: "taupe",
  burgundy: "burgundy",
  teal: "teal",
  mauve: "mauve",
  ivory: "ivory",
  slate: "slate gray",
  "slate gray": "slate gray",
  terracotta: "terracotta",
  olive: "olive green",
  "olive green": "olive green",
  coral: "coral",
  mustard: "mustard yellow",
  "mustard yellow": "mustard yellow",
  champagne: "champagne",

  // Furniture synonyms (19+ categories)
  settee: "sofa",
  couch: "sofa",
  chesterfield: "sofa",
  divan: "sofa",
  loveseat: "loveseat",
  sectional: "sectional sofa",
  "sectional sofa": "sectional sofa",
  credenza: "credenza",
  sideboard: "sideboard",
  vanity: "vanity",
  wardrobe: "wardrobe",
  armoire: "armoire",
  press: "cabinet",
  closet: "closet",
  futon: "futon",
  daybed: "daybed",
  ottoman: "ottoman",
  chaise: "chaise lounge",
  "chaise lounge": "chaise lounge",
  etagere: "etagere",
  "accent chair": "accent chair",
};

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const PLACEHOLDER_PREFIX = "\u0000V";
const PLACEHOLDER_SUFFIX = "\u0000";

/**
 * Phrase-first expansion: replace multi-word keys (e.g. "mid century", "art deco") then single words.
 * Uses placeholders so a replacement value (e.g. "mid-century modern") does not get re-expanded by a shorter key (e.g. "mid-century").
 */
export function expandMessageVocabulary(content: string): string {
  const sortedKeys = Object.keys(VOCABULARY_MAP).sort(
    (a, b) => b.length - a.length,
  );
  const placeholders: string[] = [];
  let result = content;
  for (let i = 0; i < sortedKeys.length; i++) {
    const key = sortedKeys[i];
    const value = VOCABULARY_MAP[key];
    const placeholder = `${PLACEHOLDER_PREFIX}${i}${PLACEHOLDER_SUFFIX}`;
    placeholders.push(value);
    const regex = new RegExp(`\\b${escapeRegex(key)}\\b`, "gi");
    result = result.replace(regex, placeholder);
  }
  for (let i = 0; i < placeholders.length; i++) {
    result = result.replace(
      new RegExp(escapeRegex(PLACEHOLDER_PREFIX + i + PLACEHOLDER_SUFFIX), "g"),
      placeholders[i],
    );
  }
  return result;
}

/**
 * Expand slang/abbreviation to standard term.
 */
export function expandVocabulary(term: string): string {
  const termLower = (term ?? "").toLowerCase().trim();
  return VOCABULARY_MAP[termLower] ?? term;
}

/**
 * Return normalized form for matching/deduplication (lowercase, trimmed).
 * Use with value_raw for display; value_normalized for matching.
 */
export function normalizeForMatching(term: string): string {
  if (!term || typeof term !== "string") return "";
  return expandVocabulary(term).toLowerCase().trim();
}

/**
 * Return [valueRaw, valueNormalized].
 * valueRaw: display form (expanded slang).
 * valueNormalized: for matching (lowercase, expanded).
 */
export function valueRawAndNormalized(term: string): [string, string] {
  if (!term || typeof term !== "string") return ["", ""];
  const raw = expandVocabulary(term.trim());
  return [raw, raw.toLowerCase().trim()];
}
