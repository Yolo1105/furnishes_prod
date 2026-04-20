/**
 * Navigation + API paths for furniture generation.
 * Page URLs are defined once in `image-gen/constants.ts` and re-exported here for convenience.
 */
export const FURNITURE_GENERATE_PATH = "/api/furniture/generate" as const;

export const FURNITURE_PIECES_PATH = "/api/furniture/pieces" as const;

export {
  ACCOUNT_IMAGE_GEN_ARRANGE_HREF,
  ACCOUNT_IMAGE_GEN_HREF,
} from "@/components/eva-dashboard/account/image-gen/constants";
