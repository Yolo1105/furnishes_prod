/** Studio playground app route — single literal for middleware, nav, client checks. */
export const STUDIO_PLAYGROUND_PATH_PREFIX = "/playground" as const;

export function isStudioPlaygroundPathname(pathname: string): boolean {
  return (
    pathname === STUDIO_PLAYGROUND_PATH_PREFIX ||
    pathname.startsWith(`${STUDIO_PLAYGROUND_PATH_PREFIX}/`)
  );
}
