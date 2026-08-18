import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  BrainstormSchema,
  SuggestionsSchema,
} from "@/server/conversations/chat-side-features";
import { InsightsSchema } from "@/server/conversations/chat-insights";
import { GeneratedSchema } from "@/server/recommendations/service";
import { RubricBatchSchema } from "@/server/recommendations/rubric";
import {
  collectObjectPropertyKeys,
  collectObjectSchemas,
  zodToJsonSchema,
} from "./zod-to-json-schema";

const generateStructuredSchemas = [
  { name: "SuggestionsSchema", schema: SuggestionsSchema },
  { name: "BrainstormSchema", schema: BrainstormSchema },
  { name: "GeneratedSchema", schema: GeneratedSchema },
  { name: "RubricBatchSchema", schema: RubricBatchSchema },
  { name: "InsightsSchema", schema: InsightsSchema },
] as const;

function assertStrictObject(schemaNode: Record<string, unknown>): void {
  expect(schemaNode.additionalProperties).toBe(false);
  const properties = schemaNode.properties as Record<string, unknown>;
  const required = schemaNode.required as string[];
  expect(required).toEqual(Object.keys(properties));
}

describe("zodToJsonSchema", () => {
  it("wraps output with name and strict flag", () => {
    const result = zodToJsonSchema(z.object({ id: z.string() }), "test");
    expect(result).toEqual({
      name: "test",
      strict: true,
      schema: expect.objectContaining({ type: "object" }),
    });
  });

  it("maps optional fields to nullable unions with required keys", () => {
    const result = zodToJsonSchema(
      z.object({ note: z.string().nullable().optional() }),
      "optional",
    );
    const root = result.schema as Record<string, unknown>;
    assertStrictObject(root);
    const note = (root.properties as Record<string, Record<string, unknown>>)
      .note!;
    expect(note.type).toEqual(["string", "null"]);
  });

  it("maps default fields to required keys without null", () => {
    const result = zodToJsonSchema(
      z.object({ tags: z.array(z.string()).default([]) }),
      "defaulted",
    );
    const root = result.schema as Record<string, unknown>;
    assertStrictObject(root);
    const tags = (root.properties as Record<string, Record<string, unknown>>)
      .tags!;
    expect(tags.type).toBe("array");
    expect(tags.default).toEqual([]);
  });

  describe.each(generateStructuredSchemas)("$name", ({ schema }) => {
    it("sets additionalProperties false on every object node", () => {
      const { schema: jsonSchema } = zodToJsonSchema(schema, "structured");
      for (const objectNode of collectObjectSchemas(jsonSchema)) {
        expect(objectNode.additionalProperties).toBe(false);
      }
    });

    it("lists every property key in required", () => {
      const { schema: jsonSchema } = zodToJsonSchema(schema, "structured");
      for (const objectNode of collectObjectSchemas(jsonSchema)) {
        assertStrictObject(objectNode);
      }
    });

    it("includes all nested object property keys", () => {
      const { schema: jsonSchema } = zodToJsonSchema(schema, "structured");
      const keys = collectObjectPropertyKeys(jsonSchema);
      expect(keys.length).toBeGreaterThan(0);
    });
  });
});
