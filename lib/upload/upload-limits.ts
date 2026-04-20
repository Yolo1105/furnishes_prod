/**
 * Global upload size cap — single source for R2 signing and browser-side checks.
 * Keep aligned with server validation in `lib/storage/r2.ts` (`signUploadUrl`).
 */
export const UPLOAD_MAX_BYTES = 10 * 1024 * 1024;

export function uploadMaxSizeMegabytes(): number {
  return Math.round(UPLOAD_MAX_BYTES / 1024 / 1024);
}
