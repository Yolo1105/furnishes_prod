type HandoffGo = (href: string, replace?: boolean) => boolean;

let go: HandoffGo | null = null;

export function registerRouteHandoff(fn: HandoffGo | null) {
  go = fn;
}

/** Fade through the peach cover, then navigate. Returns false if no handoff. */
export function startRouteHandoff(
  href: string,
  options?: { replace?: boolean },
): boolean {
  return go?.(href, options?.replace) ?? false;
}
