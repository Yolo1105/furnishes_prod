/**
 * Workflow routes for Canvas playground inside Account.
 * Brand "home" is the Furnishes Studio dashboard, not the public landing.
 */
export const WORKFLOW_ROUTES = {
  assistant: "/account/chat",
  style: "/account/style",
  budget: "/account/budget",
  inspiration: "/account/inspiration",
  quiz: "/account/quiz",
  collections: "/account/collections",
  home: "/account",
} as const;

export type WorkflowRouteKey = keyof typeof WORKFLOW_ROUTES;
