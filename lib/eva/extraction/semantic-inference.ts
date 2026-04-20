/**
 * Semantic inference for indirect preference extraction.
 * Maps outcome-based statements to concrete design attributes. Ported from V1 semantic_inference.py.
 */

export interface OutcomeAttributes {
  designStyle?: string[];
  colorTheme?: string[];
  furnitureLayout?: string;
}

const OUTCOME_TO_ATTRIBUTES: Record<string, OutcomeAttributes> = {
  calm: {
    designStyle: ["minimalist", "scandinavian"],
    colorTheme: ["blue", "green", "neutral", "soft", "pastel"],
    furnitureLayout: "minimal furniture, open space",
  },
  relaxing: {
    designStyle: ["minimalist", "scandinavian", "coastal"],
    colorTheme: ["blue", "green", "neutral", "soft"],
    furnitureLayout: "comfortable seating, soft textures",
  },
  peaceful: {
    designStyle: ["minimalist", "japanese"],
    colorTheme: ["neutral", "soft", "pastel"],
    furnitureLayout: "uncluttered, natural materials",
  },
  cozy: {
    designStyle: ["rustic", "traditional", "scandinavian"],
    colorTheme: ["warm", "brown", "beige", "cream", "orange"],
    furnitureLayout: "soft fabrics, layered textures, comfortable seating",
  },
  warm: {
    designStyle: ["traditional", "rustic", "transitional"],
    colorTheme: ["warm", "brown", "beige", "cream", "orange", "yellow"],
    furnitureLayout: "textured materials, soft lighting",
  },
  inviting: {
    designStyle: ["traditional", "transitional"],
    colorTheme: ["warm", "neutral"],
    furnitureLayout: "welcoming seating arrangement",
  },
  sleek: {
    designStyle: ["modern", "contemporary"],
    colorTheme: ["neutral", "black", "white", "gray"],
    furnitureLayout: "clean lines, minimal decor",
  },
  sophisticated: {
    designStyle: ["modern", "contemporary", "transitional"],
    colorTheme: ["neutral", "deep", "rich"],
    furnitureLayout: "quality pieces, curated selection",
  },
  elegant: {
    designStyle: ["traditional", "transitional", "glam"],
    colorTheme: ["neutral", "deep", "rich"],
    furnitureLayout: "refined pieces, balanced composition",
  },
  "easy to clean": {
    designStyle: ["modern", "minimalist"],
    colorTheme: ["neutral", "light"],
    furnitureLayout: "minimal fabric, hard surfaces, easy-access storage",
  },
  durable: {
    designStyle: ["modern", "industrial", "rustic"],
    colorTheme: ["neutral", "dark"],
    furnitureLayout: "sturdy materials, practical furniture",
  },
  "kid-friendly": {
    designStyle: ["modern", "transitional"],
    colorTheme: ["neutral", "bright"],
    furnitureLayout: "rounded corners, washable fabrics, storage solutions",
  },
  "instagram-worthy": {
    designStyle: ["modern", "contemporary", "trendy"],
    colorTheme: ["bold", "trending"],
    furnitureLayout: "statement pieces, good lighting, photogenic arrangement",
  },
  impressive: {
    designStyle: ["modern", "contemporary", "glam"],
    colorTheme: ["rich", "sophisticated"],
    furnitureLayout: "high-end pieces, curated selection",
  },
  focused: {
    designStyle: ["modern", "minimalist"],
    colorTheme: ["neutral", "calm"],
    furnitureLayout: "dedicated workspace, minimal distractions, good lighting",
  },
  productive: {
    designStyle: ["modern", "minimalist"],
    colorTheme: ["neutral"],
    furnitureLayout: "organized workspace, functional furniture",
  },
};

const COMPARATIVE_REFERENCES: Record<string, OutcomeAttributes> = {
  "boutique hotel": {
    designStyle: ["transitional", "contemporary"],
    colorTheme: ["neutral", "sophisticated"],
    furnitureLayout:
      "curated pieces, statement lighting, plush seating, upscale feel",
  },
  "restoration hardware": {
    designStyle: ["transitional", "industrial"],
    colorTheme: ["neutral", "warm"],
    furnitureLayout:
      "substantial furniture, natural materials, industrial accents",
  },
  "coffee shop": {
    designStyle: ["industrial", "rustic", "eclectic"],
    colorTheme: ["warm", "brown", "neutral"],
    furnitureLayout: "cozy seating, ambient lighting, casual arrangement",
  },
  scandinavian: {
    designStyle: ["scandinavian"],
    colorTheme: ["white", "neutral", "light"],
    furnitureLayout: "minimal furniture, natural materials, light and airy",
  },
};

const OUTCOME_PATTERNS = [
  /\b(?:want|need|looking for)\s+(?:it|the room|the space|this)\s+to\s+(?:feel|be|look)\s+([a-z\s]+?)(?:\s|$|,|\.)/g,
  /\b(?:want|need|looking for)\s+(?:something|a space)\s+that\s+(?:feels|is|looks)\s+([a-z\s]+?)(?:\s|$|,|\.)/g,
  /\b(?:should|must)\s+be\s+([a-z\s]+?)(?:\s|$|,|\.)/g,
];
const FUNCTIONAL_PATTERNS = [
  /\b(?:easy|simple)\s+to\s+([a-z\s]+?)(?:\s|$|,|\.)/g,
  /\b(?:need|must|should)\s+be\s+([a-z\s]+?)(?:\s|$|,|\.)/g,
  /\b(?:looking for|want)\s+([a-z\s]+?)(?:\s|$|,|\.)\s+(?:furniture|pieces|items)/g,
];

/**
 * Detect outcome-based statements in message. Returns list of [outcome_term, confidence].
 */
export function detectOutcomeStatements(
  message: string,
): Array<[string, number]> {
  const messageLower = message.toLowerCase();
  const detected: Array<[string, number]> = [];
  const seen = new Set<string>();

  for (const re of OUTCOME_PATTERNS) {
    const copy = new RegExp(re.source, re.flags);
    let m: RegExpExecArray | null;
    while ((m = copy.exec(messageLower)) !== null) {
      const outcome = m[1].trim().replace(/\s+(and|or|but|,)$/, "");
      if (outcome.length > 2 && !seen.has(outcome)) {
        seen.add(outcome);
        const confidence = /want|need/.test(m[0]) ? 0.8 : 0.6;
        detected.push([outcome, confidence]);
      }
    }
  }
  for (const re of FUNCTIONAL_PATTERNS) {
    const copy = new RegExp(re.source, re.flags);
    let m: RegExpExecArray | null;
    while ((m = copy.exec(messageLower)) !== null) {
      const requirement = m[1].trim();
      if (requirement.length > 2 && !seen.has(requirement)) {
        seen.add(requirement);
        detected.push([requirement, 0.7]);
      }
    }
  }
  return detected;
}

/**
 * Infer design attributes from an outcome statement.
 */
export function inferAttributesFromOutcome(
  outcome: string,
): OutcomeAttributes | null {
  const outcomeLower = outcome.toLowerCase().trim();
  if (OUTCOME_TO_ATTRIBUTES[outcomeLower])
    return OUTCOME_TO_ATTRIBUTES[outcomeLower];
  for (const [key, attrs] of Object.entries(OUTCOME_TO_ATTRIBUTES)) {
    if (outcomeLower.includes(key)) return attrs;
  }
  for (const [refKey, attrs] of Object.entries(COMPARATIVE_REFERENCES)) {
    if (outcomeLower.includes(refKey)) return attrs;
  }
  return null;
}

/**
 * Extract preferences from indirect/outcome-based statements.
 * Returns combined attributes (V3 field names: style, color, furniture for layout).
 */
export function extractIndirectPreferences(
  message: string,
): Record<string, string | string[]> {
  const statements = detectOutcomeStatements(message);
  const combined: {
    designStyle: string[];
    colorTheme: string[];
    furnitureLayout: string[];
  } = {
    designStyle: [],
    colorTheme: [],
    furnitureLayout: [],
  };
  for (const [outcome] of statements) {
    const inferred = inferAttributesFromOutcome(outcome);
    if (inferred) {
      if (inferred.designStyle)
        combined.designStyle.push(...inferred.designStyle);
      if (inferred.colorTheme) combined.colorTheme.push(...inferred.colorTheme);
      if (inferred.furnitureLayout)
        combined.furnitureLayout.push(inferred.furnitureLayout);
    }
  }
  const out: Record<string, string | string[]> = {};
  const styleSet = [...new Set(combined.designStyle)];
  const colorSet = [...new Set(combined.colorTheme)];
  if (styleSet.length) out.style = styleSet.join(", ");
  if (colorSet.length) out.color = colorSet.join(", ");
  if (combined.furnitureLayout.length)
    out.furniture = combined.furnitureLayout.join("; ");
  return out;
}
