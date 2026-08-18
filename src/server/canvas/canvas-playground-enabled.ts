/** Canvas playground is on unless explicitly disabled. */
export function isCanvasPlaygroundEnabled(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return env.CANVAS_PLAYGROUND_ENABLED !== "0";
}
