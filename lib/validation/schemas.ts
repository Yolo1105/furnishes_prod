/**
 * Zod validation schemas — used by every API route and Server Action before
 * touching Prisma. Keep these in sync with `prisma/schema.prisma`.
 *
 * Convention: `XxxInput` = what the client sends (stripped of server-managed
 * fields like id/userId/createdAt). `XxxPatch` = partial update shape.
 */

import { z } from "zod";

/* ── Enums (mirror Prisma enums) ──────────────────────────── */

export const PreferenceGroupSchema = z.enum([
  "style",
  "room",
  "budget",
  "materials",
  "musthaves",
  "dealbreakers",
]);

export const PreferenceStatusSchema = z.enum(["potential", "confirmed"]);

export const HomeTypeSchema = z.enum([
  "HDB",
  "Condo",
  "Landed",
  "Rental",
  "Other",
]);

export const ProjectStatusSchema = z.enum([
  "planning",
  "sourcing",
  "in_progress",
  "done",
  "archived",
]);

export const ConversationStatusSchema = z.enum([
  "active",
  "archived",
  "shared",
]);

export const CurrencySchema = z.enum(["SGD", "MYR", "USD"]);

export const DigestFrequencySchema = z.enum(["instant", "daily", "weekly"]);

/* ── Preference ───────────────────────────────────────────── */

export const PreferenceInputSchema = z.object({
  group: PreferenceGroupSchema,
  field: z.string().min(1).max(100),
  value: z.string().min(1).max(2000),
  status: PreferenceStatusSchema.default("potential"),
  confidence: z.number().min(0).max(1),
  sourceConversationId: z.string().cuid().nullish(),
});

export const PreferencePatchSchema = PreferenceInputSchema.partial();

export type PreferenceInput = z.infer<typeof PreferenceInputSchema>;
export type PreferencePatch = z.infer<typeof PreferencePatchSchema>;

/* ── Profile ──────────────────────────────────────────────── */

export const MeasurementInputSchema = z.object({
  id: z.string().optional(),
  room: z.string().min(1).max(80),
  widthCm: z.number().int().positive().max(9999),
  heightCm: z.number().int().positive().max(9999),
  ceilingCm: z.number().int().positive().max(9999),
  doorwayCm: z.number().int().positive().max(9999),
});

export const ProfilePatchSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  phone: z
    .string()
    .regex(/^\+?[0-9 \-()]{6,20}$/, "Invalid phone")
    .nullish(),
  homeType: HomeTypeSchema.optional(),
  roomCount: z.number().int().positive().max(50).optional(),
  householdSize: z.number().int().positive().max(50).optional(),
  hasPets: z.boolean().optional(),
  hasKids: z.boolean().optional(),
  measurements: z.array(MeasurementInputSchema).max(30).optional(),
});

export type ProfilePatch = z.infer<typeof ProfilePatchSchema>;

/* ── Budget ───────────────────────────────────────────────── */

export const BudgetPatchSchema = z.object({
  minCents: z.number().int().nonnegative().optional(),
  maxCents: z.number().int().nonnegative().optional(),
  currency: CurrencySchema.optional(),
  rooms: z
    .array(
      z.object({
        id: z.string().optional(),
        room: z.string().min(1).max(80),
        allocationCents: z.number().int().nonnegative(),
        percentage: z.number().min(0).max(100).default(0),
      }),
    )
    .max(20)
    .optional(),
});

/** Full replace for account budget save (Prisma upsert). */
export const BudgetSaveSchema = z
  .object({
    minCents: z.number().int().nonnegative(),
    maxCents: z.number().int().nonnegative(),
    currency: CurrencySchema,
    rooms: z
      .array(
        z.object({
          room: z.string().min(1).max(80),
          allocationCents: z.number().int().nonnegative(),
          percentage: z.number().min(0).max(100),
        }),
      )
      .max(20),
  })
  .refine((d) => d.maxCents >= d.minCents, {
    message: "Maximum must be greater than or equal to minimum",
    path: ["maxCents"],
  });

export type BudgetSaveInput = z.infer<typeof BudgetSaveSchema>;

/* ── Conversation ─────────────────────────────────────────── */

export const ConversationPatchSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  status: ConversationStatusSchema.optional(),
  projectId: z.string().cuid().nullish(),
  tags: z.array(z.string().min(1).max(40)).max(20).optional(),
});

/* ── Shortlist ────────────────────────────────────────────── */

export const ShortlistAddSchema = z.object({
  productId: z.string().min(1).max(100),
  projectId: z.string().cuid().nullish(),
});

export const ShortlistPatchSchema = z.object({
  projectId: z.string().cuid().nullish(),
});

/* ── Project ──────────────────────────────────────────────── */

export const ProjectInputSchema = z.object({
  title: z.string().min(1).max(120),
  description: z.string().max(2000).default(""),
  room: z.string().min(1).max(80),
  status: ProjectStatusSchema.default("planning"),
  budgetCents: z.number().int().nonnegative().default(0),
  currency: CurrencySchema.default("SGD"),
  coverHue: z.number().int().min(0).max(360),
  progress: z.number().int().min(0).max(100).default(0),
});

export const ProjectPatchSchema = ProjectInputSchema.partial();

/* ── Notifications ────────────────────────────────────────── */

export const NotificationMatrixSchema = z.record(
  z.string(), // category key
  z.object({
    email: z.boolean().optional(),
    sms: z.boolean().optional(),
    push: z.boolean().optional(),
  }),
);

export const NotificationPrefsPatchSchema = z.object({
  matrix: NotificationMatrixSchema.optional(),
  digestFrequency: DigestFrequencySchema.optional(),
  quietHoursStart: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .optional(),
  quietHoursEnd: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .optional(),
});

/* ── Auth ─────────────────────────────────────────────────── */

export const ForgotPasswordInputSchema = z.object({
  email: z.string().email().toLowerCase(),
});

export const ResetPasswordInputSchema = z.object({
  token: z.string().length(64),
  newPassword: z
    .string()
    .min(12, "Passphrase should be at least 12 characters")
    .max(200),
});
