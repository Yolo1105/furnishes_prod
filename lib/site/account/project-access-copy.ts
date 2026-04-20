import type { Project } from "./types";

/**
 * Default collaboration fields until the API exposes sharing / membership on list rows.
 * Keeps list + draft mappers aligned without repeating empty placeholders.
 */
export const PROJECT_COLLABORATION_DEFAULTS: Pick<
  Project,
  "members" | "isShared"
> = {
  members: [],
  isShared: false,
};

/**
 * Account project surfaces: collaboration is not productized yet.
 * Single source so new-project form, detail overview, and Access tab stay consistent.
 */
export const PROJECT_ACCESS_COPY = {
  newProjectFormNotice:
    "Projects are private to your account. Sharing or inviting others to a project is not available yet.",
  overviewOwnerFootnote:
    "Projects are personal workspaces today. Inviting teammates to the same project is not available yet.",
  accessTabIntro:
    "This project is only visible to your account. Shared projects and invites are not available yet — use export/handoff from the Eva workspace when you need to share progress outside the app.",
} as const;
