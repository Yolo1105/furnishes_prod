/**
 * State change handler: detect retractions/updates and resolve to preference removals/updates.
 * Ported from V1 state_change_handler.py.
 */
import { getFieldIds } from "@/lib/eva/domain/fields";
import { getDomainConfig } from "@/lib/eva/domain/config";

export type ChangeIntent = {
  hasChange: boolean;
  changeType: "retraction" | "update" | null;
  oldValues: string[];
  newValue: string | null;
};

const RETRACTION_PATTERNS: Array<{ pattern: RegExp; group: number }> = [
  {
    pattern:
      /\b(?:actually|wait|hold on|never mind|forget)\s+(?:about\s+)?(?:what\s+i\s+said\s+about\s+)?([a-z\s]+?)(?:\s|$|,|\.)/,
    group: 1,
  },
  {
    pattern:
      /\b(?:changed|change)\s+my\s+mind\s+(?:about\s+)?([a-z\s]+?)(?:\s|$|,|\.)/,
    group: 1,
  },
  {
    pattern:
      /\b(?:scratch|ignore|disregard)\s+(?:that|what i said about)\s+([a-z\s]+?)(?:\s|$|,|\.)/,
    group: 1,
  },
];

const UPDATE_PATTERNS: Array<{
  pattern: RegExp;
  oldGroup: number;
  newGroup: number;
}> = [
  {
    pattern: /\b(?:actually|wait|correction)\s+([a-z\s]+?)(?:\s|$|,|\.)/,
    oldGroup: 1,
    newGroup: 0,
  },
  {
    pattern:
      /\b(?:changed|change)\s+(?:from|it to)\s+([a-z\s]+?)\s+(?:to|from)\s+([a-z\s]+?)(?:\s|$|,|\.)/,
    oldGroup: 1,
    newGroup: 2,
  },
  {
    pattern:
      /\b(?:not|no longer)\s+([a-z\s]+?)\s+(?:anymore|now|,)\s+(?:but|instead)\s+([a-z\s]+?)(?:\s|$|,|\.)/,
    oldGroup: 1,
    newGroup: 2,
  },
];

export function detectStateChangeIntent(message: string): ChangeIntent {
  const lower = message.toLowerCase().trim();
  const result: ChangeIntent = {
    hasChange: false,
    changeType: null,
    oldValues: [],
    newValue: null,
  };

  for (const { pattern, group } of RETRACTION_PATTERNS) {
    const m = lower.match(pattern);
    if (m?.[group]) {
      result.hasChange = true;
      result.changeType = "retraction";
      result.oldValues.push(m[group].trim());
      return result;
    }
  }

  for (const { pattern, oldGroup, newGroup } of UPDATE_PATTERNS) {
    const m = lower.match(pattern);
    if (m?.[oldGroup]) {
      result.hasChange = true;
      result.changeType = "update";
      result.oldValues.push(m[oldGroup].trim());
      if (newGroup > 0 && m[newGroup]) result.newValue = m[newGroup].trim();
      return result;
    }
  }

  return result;
}

/** Fields that store list values (comma-separated in DB). */
function getListFieldIds(): Set<string> {
  const fields = getDomainConfig().fields ?? [];
  const list = new Set<string>();
  for (const f of fields) {
    if (f.type === "list") list.add(f.id);
  }
  return list;
}

export type MatchingPreference = {
  field: string;
  value: string;
  isList: boolean;
};

/**
 * Find a preference matching the search term in current prefs or recent messages.
 */
export function findMatchingPreference(
  searchTerm: string,
  currentPrefs: Record<string, string>,
  recentMessageContents: string[],
): MatchingPreference | null {
  const search = searchTerm.toLowerCase().trim();
  const listFields = getListFieldIds();
  const fieldIds = getFieldIds();

  for (const field of fieldIds) {
    const raw = currentPrefs[field];
    if (raw == null || raw === "") continue;
    const isList = listFields.has(field);
    if (isList) {
      const items = raw.split(",").map((s) => s.trim());
      for (const item of items) {
        if (
          item.toLowerCase().includes(search) ||
          search.includes(item.toLowerCase())
        )
          return { field, value: item, isList: true };
      }
    } else {
      if (
        raw.toLowerCase().includes(search) ||
        search.includes(raw.toLowerCase())
      )
        return { field, value: raw, isList: false };
    }
  }

  for (const content of recentMessageContents) {
    if (content.toLowerCase().includes(search))
      return { field: "unknown", value: searchTerm, isList: false };
  }

  return null;
}

export type StateRemoval = { field: string; value: string };
export type StateUpdate = { field: string; value: string };

/**
 * Produce removals and updates from change intent. Caller applies these to DB.
 */
export function createStateChangeUpdate(
  intent: ChangeIntent,
  currentPrefs: Record<string, string>,
  recentMessageContents: string[],
): { removals: StateRemoval[]; updates: StateUpdate[] } {
  const removals: StateRemoval[] = [];
  const updates: StateUpdate[] = [];

  if (intent.changeType === "retraction") {
    for (const oldVal of intent.oldValues) {
      const match = findMatchingPreference(
        oldVal,
        currentPrefs,
        recentMessageContents,
      );
      if (match && match.field !== "unknown") {
        removals.push({ field: match.field, value: match.value });
        if (match.isList) {
          const raw = currentPrefs[match.field];
          const items = raw
            .split(",")
            .map((s) => s.trim())
            .filter((s) => s.toLowerCase() !== match.value.toLowerCase());
          updates.push({ field: match.field, value: items.join(", ") });
        } else {
          updates.push({ field: match.field, value: "" });
        }
      }
    }
  } else if (intent.changeType === "update" && intent.newValue) {
    for (const oldVal of intent.oldValues) {
      const match = findMatchingPreference(
        oldVal,
        currentPrefs,
        recentMessageContents,
      );
      if (match && match.field !== "unknown") {
        if (match.isList) {
          const raw = currentPrefs[match.field];
          const items = raw.split(",").map((s) => s.trim());
          const newItems = items.map((item) =>
            item.toLowerCase() === match.value.toLowerCase()
              ? intent.newValue!
              : item,
          );
          updates.push({ field: match.field, value: newItems.join(", ") });
        } else {
          updates.push({ field: match.field, value: intent.newValue });
        }
      }
    }
  }

  return { removals, updates };
}
