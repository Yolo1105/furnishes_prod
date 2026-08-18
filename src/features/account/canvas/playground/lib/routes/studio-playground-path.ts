/** Account Canvas hosts the ported playground. */
export const STUDIO_PLAYGROUND_PATH_PREFIX = "/account/canvas" as const;

export function isStudioPlaygroundPathname(pathname: string): boolean {
  return (
    pathname === STUDIO_PLAYGROUND_PATH_PREFIX ||
    pathname.startsWith(`${STUDIO_PLAYGROUND_PATH_PREFIX}/`)
  );
}
