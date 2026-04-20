import { z } from "zod";

/** Persisted in `Project.executionState` — validated on read/write. */
export const ExecutionSubstitutionEntrySchema = z.object({
  at: z.string(),
  kind: z.enum([
    "decision_update",
    "shortlist_update",
    "constraint_shift",
    "preferred_path_change",
    "manual",
  ]),
  summary: z.string().max(2000),
});

export const ExecutionBlockerResolutionEntrySchema = z.object({
  blockerId: z.string(),
  resolvedAt: z.string(),
  summary: z.string().max(2000),
});

export const ExecutionFingerprintsSchema = z.object({
  decision: z.string().optional(),
  shortlist: z.string().optional(),
});

export const ExecutionChangeImpactSummarySchema = z.object({
  evaluatedAt: z.string(),
  decisionFingerprintChanged: z.boolean(),
  shortlistFingerprintChanged: z.boolean(),
  affectedAreas: z.array(z.string()),
  stillValid: z.array(z.string()),
  mustRevisit: z.array(z.string()),
});

export const ProjectExecutionStateSchema = z.object({
  fingerprints: ExecutionFingerprintsSchema.optional(),
  substitutionLog: z
    .array(ExecutionSubstitutionEntrySchema)
    .max(100)
    .optional(),
  blockerResolutionHistory: z
    .array(ExecutionBlockerResolutionEntrySchema)
    .max(100)
    .optional(),
  changeImpactSummary: ExecutionChangeImpactSummarySchema.nullable().optional(),
  readinessChecks: z
    .record(z.string(), z.union([z.boolean(), z.string(), z.number()]))
    .optional(),
});

export type ProjectExecutionState = z.infer<typeof ProjectExecutionStateSchema>;
export type ExecutionSubstitutionEntry = z.infer<
  typeof ExecutionSubstitutionEntrySchema
>;

export function parseProjectExecutionState(
  raw: unknown,
): ProjectExecutionState {
  const r = ProjectExecutionStateSchema.safeParse(raw ?? {});
  return r.success ? r.data : {};
}
