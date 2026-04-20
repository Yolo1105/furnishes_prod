/**
 * Cheap routing fixes before LLM field review — catches common style vs color mixups.
 */
export type RoutableEntity = { field: string; text: string };

const NAMED_STYLE =
  /\b(scandinavian|japandi|industrial|mid[- ]century|farmhouse|coastal|bohemian|minimalist|contemporary|traditional|transitional|rustic|eclectic|art deco|wabi[- ]sabi|modern|maximalist)\b/i;

export function applyStyleColorRoutingHeuristics<T extends RoutableEntity>(
  entities: T[],
): T[] {
  return entities.map((entity) => {
    if (entity.field !== "style") return entity;
    const raw = entity.text.trim();
    if (!raw) return entity;

    const lower = raw.toLowerCase();

    if (
      lower === "color palette" ||
      lower === "palette" ||
      lower === "colors" ||
      lower === "color"
    ) {
      return { ...entity, field: "color" };
    }

    const explicitColorTopic =
      /\bcolor\s+palette\b/i.test(raw) ||
      /\bcoordinating\s+colou?rs?\b/i.test(raw) ||
      /\bpaint\s+colou?r\b/i.test(raw) ||
      /\bwall\s+colou?r\b/i.test(raw) ||
      /\baccent\s+colou?r\b/i.test(raw) ||
      /\bearth\s+tones?\b/i.test(raw) ||
      /\bneutral(s)?\b/i.test(raw) ||
      /\bwarm\s+tones?\b/i.test(raw) ||
      /\bcool\s+tones?\b/i.test(raw);

    if (explicitColorTopic) {
      return { ...entity, field: "color" };
    }

    if (/\bpalette\b/i.test(raw) && !NAMED_STYLE.test(raw)) {
      return { ...entity, field: "color" };
    }

    return entity;
  });
}
