/**
 * Canonical public paths for core workflows (assistant, planning, inspiration).
 * Single source for these hrefs — import here instead of scattering literals.
 */
export const WORKFLOW_ROUTES = {
  assistant: "/chatbot",
  style: "/style",
  budget: "/budget",
  inspiration: "/inspiration",
  quiz: "/quiz",
  collections: "/collections",
  home: "/",
} as const;

export type WorkflowRouteKey = keyof typeof WORKFLOW_ROUTES;
