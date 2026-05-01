/**
 * Client nav: hide Playground when `NEXT_PUBLIC_STUDIO_ENABLED=0`.
 * Unset → visible (matches default-on Studio unless `STUDIO_ENABLED` is off server-side).
 */
export function isPlaygroundNavVisible(): boolean {
  return process.env.NEXT_PUBLIC_STUDIO_ENABLED?.trim() !== "0";
}
