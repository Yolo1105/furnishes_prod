export type AssistantPersonaId =
  "eva-general" | "eva-style" | "eva-plan" | "eva-budget";

export type AssistantPersonaDefinition = {
  id: AssistantPersonaId;
  name: string;
  tagline: string;
  description: string;
  primaryGoal: string;
  replyStyle: string;
  priorityRules: string[];
  suggestionStyle: string;
  idealUseCases: string[];
  focus: "general" | "style" | "layout" | "budget";
  traits: string[];
};

export type AssistantPersonaSummary = {
  id: AssistantPersonaId;
  name: string;
  tagline: string;
  description: string;
  focus: "general" | "style" | "layout" | "budget";
  traits: string[];
};
