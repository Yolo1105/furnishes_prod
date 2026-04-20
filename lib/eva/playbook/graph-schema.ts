import { z } from "zod";

const PlaybookNodeTypeSchema = z.enum([
  "start",
  "collect",
  "clarify",
  "generate",
  "condition",
  "knowledge",
  "end",
]);

const ResponseLengthHintSchema = z.enum([
  "short",
  "medium",
  "detailed",
  "auto",
]);

const PlaybookNodeConfigSchema = z
  .object({
    systemPromptSuffix: z.string().max(50_000).optional(),
    requiredFields: z.array(z.string().max(200)).max(500).optional(),
    extractionFocus: z.array(z.string().max(200)).max(500).optional(),
    ragEnabled: z.boolean().optional(),
    designRulesEnabled: z.boolean().optional(),
    responseLength: ResponseLengthHintSchema.optional(),
    clarificationTemplate: z.string().max(20_000).optional(),
    onEnterAction: z
      .enum([
        "generate_brief",
        "generate_shopping_list",
        "generate_suggestions",
      ])
      .nullable()
      .optional(),
  })
  .strict();

const EdgeConditionTypeSchema = z.enum([
  "fields_complete",
  "confidence_above",
  "confidence_below",
  "intent_match",
  "always",
  "field_has_value",
  "first_message",
]);

const EdgeConditionSchema = z
  .object({
    type: EdgeConditionTypeSchema,
    threshold: z.number().min(0).max(1).optional(),
    intents: z.array(z.string().max(200)).max(100).optional(),
    field: z.string().max(200).optional(),
  })
  .strict();

export const PlaybookNodeSchema = z
  .object({
    id: z.string().min(1).max(200),
    x: z.number().finite(),
    y: z.number().finite(),
    w: z.number().min(0).max(50_000),
    title: z.string().min(1).max(500),
    body: z.string().max(20_000),
    type: PlaybookNodeTypeSchema,
    icon: z.string().min(1).max(120),
    config: PlaybookNodeConfigSchema.default({}),
  })
  .strict();

export const PlaybookEdgeSchema = z
  .object({
    id: z.string().min(1).max(200),
    from: z.string().min(1).max(200),
    to: z.string().min(1).max(200),
    label: z.string().max(500).optional(),
    condition: EdgeConditionSchema.optional(),
    priority: z.number().int().min(-1000).max(1000).optional(),
  })
  .strict();

export const PlaybookGraphBodySchema = z
  .object({
    nodes: z.array(PlaybookNodeSchema).max(2000),
    edges: z.array(PlaybookEdgeSchema).max(5000),
  })
  .superRefine((data, ctx) => {
    const ids = new Set(data.nodes.map((n) => n.id));
    data.edges.forEach((e, i) => {
      if (!ids.has(e.from)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Edge ${e.id}: unknown from node "${e.from}"`,
          path: ["edges", i, "from"],
        });
      }
      if (!ids.has(e.to)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Edge ${e.id}: unknown to node "${e.to}"`,
          path: ["edges", i, "to"],
        });
      }
    });
  });

export type PlaybookGraphBody = z.infer<typeof PlaybookGraphBodySchema>;
