import type { AssistantDefinition } from "@/lib/eva/assistants/catalog";

/**
 * Default follow-up chips before `/api/suggestions` returns — varied by persona + coarse workflow stage.
 */
export function getDefaultFollowUpChips(
  focus: AssistantDefinition["focus"],
  workflowStage?: string | null,
): string[] {
  const s = (workflowStage ?? "").toLowerCase();

  const early =
    s.includes("brief") ||
    s.includes("explore") ||
    s.includes("discover") ||
    s === "" ||
    s.includes("start");
  const narrow =
    s.includes("shortlist") ||
    s.includes("select") ||
    s.includes("decide") ||
    s.includes("finalize");
  const execute =
    s.includes("execute") || s.includes("buy") || s.includes("order");

  if (focus === "style") {
    if (execute) {
      return [
        "Pull the look together with textiles",
        "Art + lighting to match the mood",
        "What to buy first for max impact",
      ];
    }
    if (narrow) {
      return [
        "Compare two palettes side by side",
        "Which direction feels more ‘you’?",
        "One tweak that would elevate everything",
      ];
    }
    return [
      "Help me name the mood in one line",
      "Two style directions worth comparing",
      "Materials that fit this palette",
    ];
  }

  if (focus === "layout") {
    if (execute) {
      return [
        "Final layout check before I buy",
        "Clearances I should double-check",
        "Traffic flow with this arrangement",
      ];
    }
    if (narrow) {
      return [
        "Sofa wall vs focal wall — tradeoffs",
        "Rug size for this seating group",
        "One layout tweak for better flow",
      ];
    }
    return [
      "Sketch zones for this room",
      "Where the main path should go",
      "Furniture scale vs room size",
    ];
  }

  if (focus === "budget") {
    if (execute) {
      return [
        "What to order first on this budget",
        "Hidden costs to watch for",
        "Cheaper alternative that still fits",
      ];
    }
    if (narrow) {
      return [
        "Splurge vs save for this shortlist",
        "If I cut one line item, which one?",
        "Phased buying over the next weeks",
      ];
    }
    return [
      "Priorities if funds are tight",
      "Biggest bang-for-buck upgrades",
      "Rough tiers for what to buy when",
    ];
  }

  // general
  if (early) {
    return [
      "What should we decide first?",
      "Two directions worth comparing",
      "Constraints I should mention up front",
    ];
  }
  if (narrow) {
    return [
      "Pick between my top two options",
      "What would make this feel finished?",
      "Risk check before I commit",
    ];
  }
  if (execute) {
    return [
      "Turn this into a simple action list",
      "What to buy first",
      "Anything I’m overlooking?",
    ];
  }
  return [
    "What should we tackle next?",
    "Compare two realistic options",
    "One thing to clarify before I buy",
  ];
}
