/**
 * Image MIME types allowed for chat image attachments (subset of server `ALLOWED_MIME_TYPES`; excludes PDF).
 */
export const CHAT_IMAGE_UPLOAD_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
] as const;

export const CHAT_IMAGE_FILE_INPUT_ACCEPT =
  CHAT_IMAGE_UPLOAD_MIME_TYPES.join(",");
