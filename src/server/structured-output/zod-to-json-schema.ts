/**
 * Convert a Zod subset to OpenAI strict-mode JSON Schema.
 * Supports object/array/enum/primitives/nullable/optional/default wrappers.
 */

import type { z } from "zod";

type JsonSchema = Record<string, unknown>;

type ZodDef = {
  shape?: Record<string, z.ZodType>;
  element?: z.ZodType;
  innerType?: z.ZodType;
  entries?: Record<string, string>;
  defaultValue?: unknown;
};

type ZodLike = z.ZodType & { type: string; def: ZodDef };

export function zodToJsonSchema(
  schema: z.ZodType,
  name: string,
): { name: string; strict: true; schema: JsonSchema } {
  return {
    name,
    strict: true,
    schema: convertSchema(schema),
  };
}

function convertSchema(schema: z.ZodType): JsonSchema {
  const s = schema as ZodLike;
  switch (s.type) {
    case "object":
      return convertObject(s);
    case "array":
      return { type: "array", items: convertField(s.def.element!) };
    case "enum":
      return { type: "string", enum: Object.values(s.def.entries ?? {}) };
    case "string":
      return { type: "string" };
    case "number":
      return { type: "number" };
    case "boolean":
      return { type: "boolean" };
    default:
      throw new Error(`Unsupported Zod type for strict JSON schema: ${s.type}`);
  }
}

function convertObject(schema: ZodLike): JsonSchema {
  const shape = schema.def.shape ?? {};
  const properties: Record<string, JsonSchema> = {};
  const required: string[] = [];

  for (const key of Object.keys(shape)) {
    required.push(key);
    properties[key] = convertField(shape[key]!);
  }

  return {
    type: "object",
    properties,
    required,
    additionalProperties: false,
  };
}

function convertField(schema: z.ZodType): JsonSchema {
  const s = schema as ZodLike;

  if (s.type === "default") {
    const converted = convertDefaultInner(s.def.innerType!);
    const defaultValue = s.def.defaultValue;
    if (defaultValue !== undefined && typeof defaultValue !== "function") {
      return { ...converted, default: defaultValue };
    }
    return converted;
  }

  if (s.type === "optional") {
    return withNullable(convertField(s.def.innerType!));
  }

  if (s.type === "nullable") {
    return withNullable(convertField(s.def.innerType!));
  }

  return convertSchema(schema);
}

/** Default-wrapped optionals are required keys with a fallback — no null union. */
function convertDefaultInner(schema: z.ZodType): JsonSchema {
  const s = schema as ZodLike;
  if (s.type === "optional") {
    return convertField(s.def.innerType!);
  }
  return convertField(schema);
}

function withNullable(schema: JsonSchema): JsonSchema {
  if (schemaAllowsNull(schema)) return schema;

  if (typeof schema.type === "string") {
    return { type: [schema.type, "null"] };
  }

  if (Array.isArray(schema.enum)) {
    return {
      anyOf: [schema, { type: "null" }],
    };
  }

  return {
    anyOf: [schema, { type: "null" }],
  };
}

function schemaAllowsNull(schema: JsonSchema): boolean {
  if (schema.type === "null") return true;
  if (Array.isArray(schema.type) && schema.type.includes("null")) return true;
  if (
    Array.isArray(schema.anyOf) &&
    schema.anyOf.some((entry) => (entry as JsonSchema).type === "null")
  ) {
    return true;
  }
  return false;
}

/** Collect every object node in a JSON Schema tree (for tests). */
export function collectObjectSchemas(schema: JsonSchema): JsonSchema[] {
  const objects: JsonSchema[] = [];
  walk(schema);
  return objects;

  function walk(node: JsonSchema): void {
    if (node.type === "object" && node.properties) {
      objects.push(node);
    }
    if (node.items) walk(node.items as JsonSchema);
    if (node.properties) {
      for (const prop of Object.values(
        node.properties as Record<string, JsonSchema>,
      )) {
        walk(prop);
      }
    }
    if (Array.isArray(node.anyOf)) {
      for (const branch of node.anyOf as JsonSchema[]) walk(branch);
    }
  }
}

/** All property keys that appear on object nodes (for tests). */
export function collectObjectPropertyKeys(schema: JsonSchema): string[] {
  const keys = new Set<string>();
  for (const objectSchema of collectObjectSchemas(schema)) {
    for (const key of Object.keys(
      objectSchema.properties as Record<string, unknown>,
    )) {
      keys.add(key);
    }
  }
  return [...keys];
}
