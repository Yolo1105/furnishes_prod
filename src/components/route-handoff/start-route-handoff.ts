type HandoffGo = (href: string, replace?: boolean) => boolean;

let go: HandoffGo | null = null;

export function registerRouteHandoff(fn: HandoffGo | null) {
  go = fn;
}

/** Run the natural route crossfade. Returns false if no handoff applies. */
export function startRouteHandoff(
  href: string,
  options?: { replace?: boolean },
): boolean {
  return go?.(href, options?.replace) ?? false;
}
