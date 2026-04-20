import { ACCOUNT_IMAGE_GEN_HREF } from "@/components/eva-dashboard/account/image-gen/constants";

/**
 * Canonical login URLs with `next` return paths. Prefer these over inline
 * strings so layouts, headers, and server guards stay aligned.
 */

/** After sign-in, send the user back to the marketing home page. */
export const LOGIN_RETURN_TO_HOME = "/login?next=/" as const;

/**
 * After sign-in, return to Eva Studio furniture generation.
 * Name kept for backwards compatibility; target is `ACCOUNT_IMAGE_GEN_HREF`.
 */
export const LOGIN_RETURN_TO_FURNITURE_3D_TOOL =
  `/login?next=${encodeURIComponent(ACCOUNT_IMAGE_GEN_HREF)}` as const;

/** After sign-in, send the user to the Studio shell (`/account`). */
export const LOGIN_RETURN_TO_ACCOUNT = "/login?next=/account" as const;

/** After sign-in, send the user back to staff support admin. */
export const LOGIN_RETURN_TO_ADMIN_SUPPORT =
  "/login?next=/admin/support" as const;
