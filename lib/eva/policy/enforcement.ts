import { detectIntent } from "./intent-detector";

export type PolicyRule = {
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

/** Hardcoded fallback rules — used when no playbook is active. */
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

export interface PolicyResult {
  blocked: boolean;
  clarificationMessage?: string;
}

/**
 * Check if the user's intent requires preferences that are missing.
 *
 * When `playbookRequiredFields` is provided (from the active playbook node),
 * those fields are checked regardless of intent — the playbook node says
 * "the user must provide these before I proceed".
 *
 * When no playbook fields are provided, falls back to intent-based hardcoded rules.
 */
export function checkPolicy(
  userMessage: string,
  currentPreferences: Record<string, string>,
  playbookRequiredFields?: string[] | null,
): PolicyResult {
  // ── Playbook-driven policy: check required fields from the active node ──
  if (playbookRequiredFields && playbookRequiredFields.length > 0) {
    const missing = playbookRequiredFields.filter((key) => {
      if (key === "roomDimensions") {
        return !hasRoomDimensions(currentPreferences);
      }
      const val = currentPreferences[key];
      return val === undefined || val === null || String(val).trim() === "";
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

  // ── Fallback: intent-based hardcoded rules ────────────────────────────
  const intent = detectIntent(userMessage);
  if (!intent) return { blocked: false };

  const rule = POLICY_RULES.find((r) => r.trigger === intent);
  if (!rule) return { blocked: false };

  const missing = rule.requires.filter((key) => {
    if (key === "roomDimensions") {
      return !hasRoomDimensions(currentPreferences);
    }
    const val = currentPreferences[key];
    return val === undefined || val === null || String(val).trim() === "";
  });
  if (missing.length === 0) return { blocked: false };

  return {
    blocked: true,
    clarificationMessage: rule.message,
  };
}
