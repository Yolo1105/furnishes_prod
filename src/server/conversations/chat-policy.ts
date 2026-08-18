/**
 * Policy gating: require key facts before layout / shopping / furniture advice.
 * Re-derived from legacy `lib/eva/policy/{intent-detector,enforcement}.ts`.
 *
 * Preference keys expected here (legacy-compatible for tests):
 * - roomType (or `room` from confirmed ChatPreferenceCategory)
 * - budget
 * - roomDimensions (from StyleProfile.roomDimensions JSON, or legacy string)
 */

import { detectChatPolicyIntent } from "./chat-policy-intent";

type PolicyRule = {
  trigger: string;
  requires: string[];
  message: string;
};

function hasRoomDimensions(prefs: Record<string, string>): boolean {
  const w = prefs.roomWidth?.trim();
  const l = prefs.roomLength?.trim();
  const legacy = prefs.roomDimensions?.trim();
  return Boolean((w && l) || legacy);
}

/** Hardcoded fallback rules when no workflow requiredCategories are provided. */
const POLICY_RULES: PolicyRule[] = [
  {
    trigger: "layout_advice",
    requires: ["roomType", "roomDimensions"],
    message:
      "I'd love to help with layout! Could you tell me your room dimensions first?",
  },
  {
    trigger: "shopping_list",
    requires: ["budget"],
    message: "To give you a useful shopping list, what's your budget range?",
  },
  {
    trigger: "furniture_recs",
    requires: ["roomType"],
    message:
      "What room are you furnishing? That'll help me suggest the right pieces.",
  },
];

type PolicyResult = {
  blocked: boolean;
  clarificationMessage?: string;
};

function isMissing(prefs: Record<string, string>, key: string): boolean {
  if (key === "roomDimensions") return !hasRoomDimensions(prefs);
  if (key === "roomType") {
    const val = prefs.roomType?.trim() || prefs.room?.trim();
    return !val;
  }
  const val = prefs[key];
  return val === undefined || val === null || String(val).trim() === "";
}

/**
 * Check if the user's intent requires preferences that are missing.
 * `requiredCategories` (workflow) maps onto room/budget/style/color/furniture
 * and is checked when non-empty (Phase 5); otherwise intent rules apply.
 */
export function checkPolicy(
  userMessage: string,
  currentPreferences: Record<string, string>,
  requiredCategories?: string[] | null,
): PolicyResult {
  if (requiredCategories && requiredCategories.length > 0) {
    const missing = requiredCategories.filter((key) => {
      if (key === "room") return isMissing(currentPreferences, "roomType");
      if (key === "budget") return isMissing(currentPreferences, "budget");
      return isMissing(currentPreferences, key);
    });
    if (missing.length > 0) {
      const labels = missing.map((f) =>
        f === "roomDimensions"
          ? "room dimensions"
          : f
              .replace(/([A-Z])/g, " $1")
              .toLowerCase()
              .trim(),
      );
      return {
        blocked: true,
        clarificationMessage:
          missing.length === 1
            ? `Before we continue, could you tell me your ${labels[0]}?`
            : `I need a few more details: ${labels.join(", ")}. Could you share those?`,
      };
    }
    return { blocked: false };
  }

  const intent = detectChatPolicyIntent(userMessage);
  if (!intent) return { blocked: false };

  const rule = POLICY_RULES.find((r) => r.trigger === intent);
  if (!rule) return { blocked: false };

  const missing = rule.requires.filter((key) =>
    isMissing(currentPreferences, key),
  );
  if (missing.length === 0) return { blocked: false };

  return {
    blocked: true,
    clarificationMessage: rule.message,
  };
}

export function isChatPolicyGatingEnabled(): boolean {
  const raw = process.env.CHAT_POLICY_GATING_ENABLED;
  if (raw === undefined || raw === "") return true;
  return raw !== "0";
}

/** Format StyleProfile.roomDimensions JSON into a preference string. */
function formatRoomDimensionsPreference(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  if (typeof row.raw === "string" && row.raw.trim()) return row.raw.trim();
  const width =
    typeof row.widthFeet === "number"
      ? row.widthFeet
      : typeof row.widthInches === "number"
        ? row.widthInches / 12
        : null;
  const length =
    typeof row.lengthFeet === "number"
      ? row.lengthFeet
      : typeof row.lengthInches === "number"
        ? row.lengthInches / 12
        : null;
  if (width != null && length != null) {
    return `${width}x${length}`;
  }
  return null;
}

/**
 * Build the preference record policy expects from confirmed chat prefs + dimensions.
 */
export function buildPolicyPreferenceRecord(input: {
  confirmed: Record<string, string | null>;
  roomDimensions?: unknown;
}): Record<string, string> {
  const out: Record<string, string> = {};
  if (input.confirmed.room?.trim()) {
    out.roomType = input.confirmed.room.trim();
    out.room = input.confirmed.room.trim();
  }
  if (input.confirmed.budget?.trim()) {
    out.budget = input.confirmed.budget.trim();
  }
  if (input.confirmed.style?.trim()) out.style = input.confirmed.style.trim();
  if (input.confirmed.color?.trim()) out.color = input.confirmed.color.trim();
  if (input.confirmed.furniture?.trim()) {
    out.furniture = input.confirmed.furniture.trim();
  }
  const dims = formatRoomDimensionsPreference(input.roomDimensions);
  if (dims) out.roomDimensions = dims;
  return out;
}
