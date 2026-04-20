import path from "node:path";

/** Resolved at runtime; `turbopackIgnore` avoids tracing the whole repo in `next build`. */
export const UPLOAD_DIR = path.join(
  /* turbopackIgnore: true */ process.cwd(),
  "uploads",
);

export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
export const MAX_FILE_SIZE_MB = 5;

export const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

export const CONTENT_TYPES: Record<string, string> = {
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};

export function getUploadErrorMessageSize(): string {
  return `File too large (max ${MAX_FILE_SIZE_MB}MB)`;
}
