import {
  ProjectShortlistStatus,
  ShortlistItemExternalLifecycle,
} from "@prisma/client";
import { z } from "zod";

const shortlistStatusZ = z.nativeEnum(ProjectShortlistStatus);

export const ProjectShortlistAddFromRecommendationSchema = z.object({
  conversationId: z.string().min(1),
  recommendationItem: z.object({
    id: z.string().min(1),
    title: z.string().min(1),
    summary: z.string().nullable().optional(),
    reasonWhyItFits: z.string().min(1),
    category: z.string().min(1),
    relatedPreferences: z.array(z.string()).optional(),
    estimatedPrice: z.number().nullable().optional(),
    rank: z.number().nullable().optional(),
    imageUrl: z.string().nullable().optional(),
    discussionPrompt: z.string().optional(),
  }),
  /** Overrides default (reasonWhyItFits) when saving to shortlist. */
  reasonSelected: z.string().max(8000).optional(),
  status: shortlistStatusZ.optional(),
});

export const ProjectShortlistPatchSchema = z.object({
  notes: z.string().max(8000).nullable().optional(),
  reasonSelected: z.string().max(8000).nullable().optional(),
  status: shortlistStatusZ.optional(),
  externalLifecycle: z.nativeEnum(ShortlistItemExternalLifecycle).optional(),
});

export type ProjectShortlistAddInput = z.infer<
  typeof ProjectShortlistAddFromRecommendationSchema
>;
