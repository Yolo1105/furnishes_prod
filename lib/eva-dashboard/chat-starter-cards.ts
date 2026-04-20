import { CHAT_SUGGESTION_CARDS } from "@/lib/eva-dashboard/suggestion-cards";
import {
  getAssistantById,
  type AssistantDefinition,
} from "@/lib/eva/assistants/catalog";

function roomAngle(
  roomTitle: string,
  focus: AssistantDefinition["focus"],
): string {
  const r = roomTitle.toLowerCase();
  switch (focus) {
    case "style":
      return `Define palette, materials, and mood for your ${r}.`;
    case "layout":
      return `Shape circulation, zones, and furniture fit in your ${r}.`;
    case "budget":
      return `Prioritize spend and what to buy first for your ${r}.`;
    default:
      return `Balance look, layout, and budget for your ${r}.`;
  }
}

/** Same four room starters; copy shifts with the selected assistant’s focus. */
export function getChatSuggestionCardsForAssistant(assistantId: string) {
  const def = getAssistantById(assistantId);
  return CHAT_SUGGESTION_CARDS.map((card) => ({
    ...card,
    description: roomAngle(card.title, def.focus),
  }));
}
