import type { ChatPreferenceCategory } from "./preference-types";
import { emptyPreferenceMap } from "./preference-types";

const CATEGORY_LABELS: Record<ChatPreferenceCategory, string> = {
  room: "Room Type",
  budget: "Budget Range",
  style: "Design Style",
  color: "Color Preferences",
  furniture: "Furniture Needs",
};

/** How a confirmed preference entered Eva memory. */
type PreferenceOrigin = "user" | "chat";

export function preferenceOrigin(
  source: string | null | undefined,
): PreferenceOrigin {
  return source === "extracted_confirmed" ? "chat" : "user";
}

function serializeConfirmedPreferencesForPrompt(
  preferences: Record<ChatPreferenceCategory, string | null>,
  sources?: Partial<Record<ChatPreferenceCategory, string | null>>,
): string | null {
  const userLines: string[] = [];
  const chatLines: string[] = [];

  for (const category of Object.keys(
    CATEGORY_LABELS,
  ) as ChatPreferenceCategory[]) {
    const value = preferences[category];
    if (!value) continue;
    const origin = preferenceOrigin(sources?.[category]);
    const line = `${CATEGORY_LABELS[category]}: ${value} [${
      origin === "user" ? "user-defined" : "from chat"
    }]`;
    if (origin === "user") userLines.push(line);
    else chatLines.push(line);
  }

  if (userLines.length === 0 && chatLines.length === 0) return null;

  const parts = [
    "Confirmed Eva memory:",
    "Treat user-defined preferences as hard constraints the person set themselves.",
    "Treat from-chat preferences as accepted captures from conversation — honor them, and ask before changing them if intent is unclear.",
  ];
  if (userLines.length > 0) {
    parts.push("User-defined:", ...userLines.map((line) => `- ${line}`));
  }
  if (chatLines.length > 0) {
    parts.push("From chat:", ...chatLines.map((line) => `- ${line}`));
  }
  return parts.join("\n");
}

export type ProfileContext = {
  styleWords: string | null;
  budgetMinimum: number | null;
  budgetMaximum: number | null;
  budgetCurrency: string | null;
  projectName: string | null;
  projectSummary: string | null;
};

export function mergePromptPreferenceContext(input: {
  memoryEnabled: boolean;
  confirmed: Record<ChatPreferenceCategory, string | null>;
  confirmedSources?: Partial<Record<ChatPreferenceCategory, string | null>>;
  profile: ProfileContext;
}): {
  confirmedPreferences: Record<ChatPreferenceCategory, string | null>;
  profileContext: ProfileContext;
  preferenceBlock: string | null;
  profileBlock: string | null;
} {
  if (!input.memoryEnabled) {
    return {
      confirmedPreferences: emptyPreferenceMap(),
      profileContext: {
        styleWords: null,
        budgetMinimum: null,
        budgetMaximum: null,
        budgetCurrency: null,
        projectName: input.profile.projectName,
        projectSummary: input.profile.projectSummary,
      },
      preferenceBlock: null,
      profileBlock: serializeProfileFallback({
        styleWords: null,
        budgetMinimum: null,
        budgetMaximum: null,
        budgetCurrency: null,
        projectName: input.profile.projectName,
        projectSummary: input.profile.projectSummary,
      }),
    };
  }

  const confirmed = { ...input.confirmed };
  const profile: ProfileContext = { ...input.profile };

  // Confirmed UserPreference takes precedence over StyleProfile/Budget fallbacks.
  if (confirmed.style) profile.styleWords = null;
  if (confirmed.budget) {
    profile.budgetMinimum = null;
    profile.budgetMaximum = null;
  }

  return {
    confirmedPreferences: confirmed,
    profileContext: profile,
    preferenceBlock: serializeConfirmedPreferencesForPrompt(
      confirmed,
      input.confirmedSources,
    ),
    profileBlock: serializeProfileFallback(profile),
  };
}

function serializeProfileFallback(profile: ProfileContext): string | null {
  const lines: string[] = [];
  if (profile.styleWords) {
    lines.push(`Style profile words: ${profile.styleWords}`);
  }
  if (
    profile.budgetMinimum != null ||
    profile.budgetMaximum != null ||
    profile.budgetCurrency
  ) {
    const currency = profile.budgetCurrency ?? "SGD";
    const min =
      profile.budgetMinimum != null ? String(profile.budgetMinimum) : "?";
    const max =
      profile.budgetMaximum != null ? String(profile.budgetMaximum) : "?";
    lines.push(`Account budget envelope: ${min}–${max} ${currency}`);
  }
  if (profile.projectName) {
    lines.push(`Active project: ${profile.projectName}`);
  }
  if (profile.projectSummary) {
    lines.push(`Project summary: ${profile.projectSummary}`);
  }
  if (lines.length === 0) return null;
  return `Account profile context:\n${lines.join("\n")}`;
}
