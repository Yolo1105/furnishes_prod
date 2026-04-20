/**
 * Stable chat keys for compact rails (isolated from `/chatbot` workspace tab keys).
 */

/** Marketing site hover rail — single shared thread. */
export const SITE_MARKETING_RAIL_CHAT_KEY = "site-rail";

const STUDIO_RAIL_PREFIX = "studio";
const STUDIO_RAIL_NO_PROJECT = "none";

export function studioRailChatKey(activeProjectId: string | null): string {
  return `${STUDIO_RAIL_PREFIX}-${activeProjectId ?? STUDIO_RAIL_NO_PROJECT}`;
}
