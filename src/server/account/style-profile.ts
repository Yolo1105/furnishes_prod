import { z } from "zod";
import { prisma } from "@/server/db";
import { err, ok, type ServiceResult } from "@/server/result";

const PROPERTY_TYPES = ["HDB", "Condo", "Landed", "Rental", "Other"] as const;

const spacePreferencesSchema = z.object({
  propertyType: z.enum(PROPERTY_TYPES).optional(),
  mainRoom: z.string().trim().max(40).optional().or(z.literal("")),
  ceiling: z.string().trim().max(40).optional().or(z.literal("")),
  doorway: z.string().trim().max(40).optional().or(z.literal("")),
});

const styleSchema = z.object({
  displayName: z
    .string()
    .trim()
    .max(80, "Display name must be 80 characters or fewer.")
    .optional()
    .or(z.literal("")),
  styleWords: z
    .string()
    .trim()
    .max(500, "Style words must be 500 characters or fewer.")
    .optional()
    .or(z.literal("")),
  preferences: spacePreferencesSchema.optional(),
});

type StyleSpacePreferences = {
  propertyType: (typeof PROPERTY_TYPES)[number] | "";
  mainRoom: string;
  ceiling: string;
  doorway: string;
};

type StyleProfileData = {
  displayName: string;
  styleWords: string;
  preferences: StyleSpacePreferences;
};

/** Presentation model for the Style surface (persisted + display helpers). */
type FullStyleProfile = StyleProfileData & {
  heroLabel: string;
  heroSummary: string;
  propertyType: (typeof PROPERTY_TYPES)[number];
};

function emptyPreferences(): StyleSpacePreferences {
  return {
    propertyType: "",
    mainRoom: "",
    ceiling: "",
    doorway: "",
  };
}

function parsePreferencesJson(
  raw: string | null | undefined,
): StyleSpacePreferences {
  if (!raw) return emptyPreferences();
  try {
    const parsed = spacePreferencesSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) return emptyPreferences();
    return {
      propertyType: parsed.data.propertyType ?? "",
      mainRoom: parsed.data.mainRoom?.trim() || "",
      ceiling: parsed.data.ceiling?.trim() || "",
      doorway: parsed.data.doorway?.trim() || "",
    };
  } catch {
    return emptyPreferences();
  }
}

function serializePreferences(preferences: StyleSpacePreferences): string {
  return JSON.stringify({
    propertyType: preferences.propertyType || undefined,
    mainRoom: preferences.mainRoom.trim() || undefined,
    ceiling: preferences.ceiling.trim() || undefined,
    doorway: preferences.doorway.trim() || undefined,
  });
}

export async function getStyleProfile(
  userId: string,
): Promise<StyleProfileData> {
  const profile = await prisma.styleProfile.findUnique({ where: { userId } });
  if (!profile) {
    return {
      displayName: "",
      styleWords: "",
      preferences: emptyPreferences(),
    };
  }
  return {
    displayName: profile.displayName ?? "",
    styleWords: profile.styleWords ?? "",
    preferences: parsePreferencesJson(profile.preferencesJson),
  };
}

/**
 * Full Style page model: persisted fields plus hero labels for the wireframe.
 * Palette / mood remain fixtures on this page; quiz → PreferenceProposal ingest
 * is live (`POST /api/account/quiz-results`). TODO(polish A.4): surface accepted
 * quiz style/palette evidence here.
 */
export async function getFullStyleProfile(
  userId: string,
): Promise<FullStyleProfile> {
  const profile = await getStyleProfile(userId);
  const firstWord = profile.styleWords.trim().split(/[,\n]/)[0]?.trim() || "";
  const named = profile.displayName.trim();
  // Prefer a curated display name; otherwise title-case the lead style word.
  const heroLabel =
    named ||
    (firstWord
      ? firstWord.replace(/\b\w/g, (c) => c.toUpperCase())
      : "Warm Minimalist");
  const heroSummary =
    profile.styleWords.trim() ||
    "Natural materials, low clutter, soft contrast, mid-century leaning with muted earth tones.";
  const propertyType =
    profile.preferences.propertyType === ""
      ? ("HDB" as const)
      : profile.preferences.propertyType;

  return {
    ...profile,
    heroLabel,
    heroSummary,
    propertyType,
  };
}

export async function updateStyleProfile(
  userId: string,
  input: unknown,
): Promise<ServiceResult<StyleProfileData, "validation">> {
  const parsed = styleSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string" && !fieldErrors[key]) {
        fieldErrors[key] = issue.message;
      }
    }
    return err("validation", "Check the highlighted fields.", fieldErrors);
  }

  const existing = await getStyleProfile(userId);
  const patch = parsed.data;

  const displayName =
    patch.displayName !== undefined
      ? patch.displayName.trim() || null
      : existing.displayName || null;
  const styleWords =
    patch.styleWords !== undefined
      ? patch.styleWords.trim() || null
      : existing.styleWords || null;

  const preferences: StyleSpacePreferences = {
    propertyType:
      patch.preferences?.propertyType !== undefined
        ? patch.preferences.propertyType
        : existing.preferences.propertyType,
    mainRoom:
      patch.preferences?.mainRoom !== undefined
        ? patch.preferences.mainRoom.trim() || ""
        : existing.preferences.mainRoom,
    ceiling:
      patch.preferences?.ceiling !== undefined
        ? patch.preferences.ceiling.trim() || ""
        : existing.preferences.ceiling,
    doorway:
      patch.preferences?.doorway !== undefined
        ? patch.preferences.doorway.trim() || ""
        : existing.preferences.doorway,
  };
  const preferencesJson = serializePreferences(preferences);

  const profile = await prisma.styleProfile.upsert({
    where: { userId },
    create: { userId, displayName, styleWords, preferencesJson },
    update: { displayName, styleWords, preferencesJson },
  });

  if (patch.displayName !== undefined && displayName) {
    await prisma.user.update({
      where: { id: userId },
      data: { displayName },
    });
  }

  return ok({
    displayName: profile.displayName ?? "",
    styleWords: profile.styleWords ?? "",
    preferences: parsePreferencesJson(profile.preferencesJson),
  });
}
