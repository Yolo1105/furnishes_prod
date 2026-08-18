export function isStudioEnabled(): boolean {
  return process.env.STUDIO_ENABLED === "1";
}
