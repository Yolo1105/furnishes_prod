import { z } from "zod";
import {
  CHAT_PREFERENCE_CATEGORIES,
  type ChatPreferenceCategory,
} from "./preference-types";

export const preferenceCategorySchema = z.enum(
  CHAT_PREFERENCE_CATEGORIES as [
    ChatPreferenceCategory,
    ...ChatPreferenceCategory[],
  ],
);

export const preferenceValueSchema = z
  .string()
  .trim()
  .min(1, "Preference value is required.")
  .max(120, "Preference value must be 120 characters or fewer.")
  .refine(
    (value) => {
      for (let i = 0; i < value.length; i += 1) {
        const code = value.charCodeAt(i);
        if (code <= 0x1f || code === 0x7f) return false;
      }
      return true;
    },
    {
      message: "Preference value contains invalid characters.",
    },
  );

const extractedCandidateSchema = z.object({
  category: preferenceCategorySchema,
  value: preferenceValueSchema,
  confidence: z.number().min(0).max(1),
  evidenceText: z.string().trim().max(240).optional(),
  evidenceStart: z.number().int().nonnegative().optional(),
  evidenceEnd: z.number().int().nonnegative().optional(),
});

export const extractedCandidatesSchema = z.array(extractedCandidateSchema);
